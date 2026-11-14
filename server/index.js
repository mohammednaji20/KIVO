import express from "express";
import cors from "cors";
import path from "node:path";
import {fileURLToPath} from "node:url";
import db from "./db.js";
import {authConfigured,verifyAdminPassword,createAdminToken,readAdminCookie,isValidAdminToken,setAdminCookie,clearAdminCookie,requireAdmin} from "./auth.js";
const app=express(),PORT=process.env.PORT||3001,__dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:"5mb"}));
const getSettings=()=>Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x=>[x.key,x.value]));
app.get("/api/health",(_q,r)=>r.json({ok:true,app:"KIVO",database:"SQLite",authConfigured:authConfigured()}));
app.get("/api/auth/status",(q,r)=>r.json({configured:authConfigured(),authenticated:isValidAdminToken(readAdminCookie(q))}));
const attempts=new Map();
app.post("/api/auth/login",(q,r)=>{
 if(!authConfigured())return r.status(503).json({error:"Set SESSION_SECRET and ADMIN_PASSWORD in hosting environment variables."});
 const ip=q.ip||q.socket.remoteAddress||"unknown",now=Date.now(),a=attempts.get(ip)||{count:0,until:now+900000};
 if(now>a.until){a.count=0;a.until=now+900000}
 if(a.count>=8)return r.status(429).json({error:"Too many attempts. Try again in 15 minutes."});
 if(!verifyAdminPassword(q.body?.password||"")){a.count++;attempts.set(ip,a);return r.status(401).json({error:"Incorrect password."})}
 attempts.delete(ip);setAdminCookie(r,createAdminToken());r.json({ok:true});
});
app.post("/api/auth/logout",(_q,r)=>{clearAdminCookie(r);r.json({ok:true})});
app.get("/api/site",(_q,r)=>r.json({settings:getSettings(),services:db.prepare("SELECT * FROM services WHERE active=1 ORDER BY sort_order,id").all()}));
app.put("/api/site",requireAdmin,(q,r)=>{
 const allowed=["brandName","tagline","heroTitle","heroDescription","heroButton","aboutTitle","aboutDescription","email","instagram","linkedin","accent","announcement"];
 const stmt=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
 const tx=db.transaction(data=>{for(const k of allowed)if(typeof data[k]==="string")stmt.run(k,data[k].slice(0,5000))});
 tx(q.body||{});r.json({ok:true,settings:getSettings()});
});
app.get("/api/services",requireAdmin,(_q,r)=>r.json(db.prepare("SELECT * FROM services ORDER BY sort_order,id").all()));
app.post("/api/services",requireAdmin,(q,r)=>{const {title,description="",price="",category="Design"}=q.body;if(!title?.trim())return r.status(400).json({error:"Service title is required"});const x=db.prepare("INSERT INTO services(title,description,price,category) VALUES(?,?,?,?)").run(title.trim(),description,price,category);r.status(201).json(db.prepare("SELECT * FROM services WHERE id=?").get(x.lastInsertRowid))});
app.put("/api/services/:id",requireAdmin,(q,r)=>{const {title,description="",price="",category="Design",active=1}=q.body;if(!title?.trim())return r.status(400).json({error:"Service title is required"});db.prepare("UPDATE services SET title=?,description=?,price=?,category=?,active=? WHERE id=?").run(title.trim(),description,price,category,active?1:0,q.params.id);r.json({ok:true})});
app.delete("/api/services/:id",requireAdmin,(q,r)=>{db.prepare("DELETE FROM services WHERE id=?").run(q.params.id);r.json({ok:true})});
app.get("/api/leads",requireAdmin,(_q,r)=>r.json(db.prepare("SELECT * FROM leads ORDER BY id DESC").all()));
app.post("/api/leads",requireAdmin,(q,r)=>{const {name,company="",email="",source="Manual",status="New",value=0,notes=""}=q.body;if(!name?.trim())return r.status(400).json({error:"Lead name is required"});const x=db.prepare("INSERT INTO leads(name,company,email,source,status,value,notes) VALUES(?,?,?,?,?,?,?)").run(name,company,email,source,status,Number(value)||0,notes);r.status(201).json(db.prepare("SELECT * FROM leads WHERE id=?").get(x.lastInsertRowid))});
app.put("/api/leads/:id",requireAdmin,(q,r)=>{const {name,company="",email="",source="Manual",status="New",value=0,notes=""}=q.body;db.prepare("UPDATE leads SET name=?,company=?,email=?,source=?,status=?,value=?,notes=? WHERE id=?").run(name,company,email,source,status,Number(value)||0,notes,q.params.id);r.json({ok:true})});
app.delete("/api/leads/:id",requireAdmin,(q,r)=>{db.prepare("DELETE FROM leads WHERE id=?").run(q.params.id);r.json({ok:true})});
app.get("/api/projects",requireAdmin,(_q,r)=>r.json(db.prepare("SELECT * FROM projects ORDER BY id DESC").all()));
app.post("/api/projects",requireAdmin,(q,r)=>{const {name,client="",status="Planning",budget=0,currency="USD",deadline="",progress=0}=q.body;if(!name?.trim())return r.status(400).json({error:"Project name is required"});const x=db.prepare("INSERT INTO projects(name,client,status,budget,currency,deadline,progress) VALUES(?,?,?,?,?,?,?)").run(name,client,status,Number(budget)||0,currency,deadline,Math.max(0,Math.min(100,Number(progress)||0)));r.status(201).json(db.prepare("SELECT * FROM projects WHERE id=?").get(x.lastInsertRowid))});
app.put("/api/projects/:id",requireAdmin,(q,r)=>{const {name,client="",status="Planning",budget=0,currency="USD",deadline="",progress=0}=q.body;db.prepare("UPDATE projects SET name=?,client=?,status=?,budget=?,currency=?,deadline=?,progress=? WHERE id=?").run(name,client,status,Number(budget)||0,currency,deadline,Math.max(0,Math.min(100,Number(progress)||0)),q.params.id);r.json({ok:true})});
app.delete("/api/projects/:id",requireAdmin,(q,r)=>{db.prepare("DELETE FROM projects WHERE id=?").run(q.params.id);r.json({ok:true})});
app.get("/api/transactions",requireAdmin,(_q,r)=>r.json(db.prepare("SELECT * FROM transactions ORDER BY date DESC,id DESC").all()));
app.post("/api/transactions",requireAdmin,(q,r)=>{const {kind,description,amount,currency="USD",date}=q.body;if(!["income","expense"].includes(kind)||!description?.trim()||!(Number(amount)>0))return r.status(400).json({error:"Valid type, description and positive amount are required"});const x=db.prepare("INSERT INTO transactions(kind,description,amount,currency,date) VALUES(?,?,?,?,COALESCE(?,date('now')))").run(kind,description,Number(amount),currency,date||null);r.status(201).json(db.prepare("SELECT * FROM transactions WHERE id=?").get(x.lastInsertRowid))});
app.delete("/api/transactions/:id",requireAdmin,(q,r)=>{db.prepare("DELETE FROM transactions WHERE id=?").run(q.params.id);r.json({ok:true})});
app.get("/api/dashboard",requireAdmin,(_q,r)=>{const leads=db.prepare("SELECT COUNT(*) n FROM leads").get().n,projects=db.prepare("SELECT COUNT(*) n FROM projects WHERE status NOT IN ('Completed','Cancelled')").get().n,income=db.prepare("SELECT COALESCE(SUM(amount),0) n FROM transactions WHERE kind='income' AND currency='USD'").get().n,expenses=db.prepare("SELECT COALESCE(SUM(amount),0) n FROM transactions WHERE kind='expense' AND currency='USD'").get().n; r.json({leads,projects,income,expenses,profit:income-expenses,recentLeads:db.prepare("SELECT * FROM leads ORDER BY id DESC LIMIT 5").all(),recentProjects:db.prepare("SELECT * FROM projects ORDER BY id DESC LIMIT 5").all()})});
const dist=path.resolve(__dirname,"../dist");app.use(express.static(dist));app.get("*",(q,r,next)=>{if(q.path.startsWith("/api/"))return next();r.sendFile(path.join(dist,"index.html"),e=>{if(e)next()})});
app.listen(PORT,()=>console.log("KIVO server running on port "+PORT));