import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const getSettings = () => Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x => [x.key,x.value]));
app.get("/api/health", (_req,res) => res.json({ ok:true, app:"KIVO", database:"SQLite" }));
app.get("/api/site", (_req,res) => res.json({
 settings: getSettings(),
 services: db.prepare("SELECT * FROM services WHERE active=1 ORDER BY sort_order,id").all()
}));

app.put("/api/site", (req,res) => {
 const allowed = ["brandName","tagline","heroTitle","heroDescription","heroButton","aboutTitle","aboutDescription","email","instagram","linkedin","accent","announcement"];
 const stmt = db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
 const tx = db.transaction(data => { for (const key of allowed) if (typeof data[key] === "string") stmt.run(key, data[key].slice(0,5000)); });
 tx(req.body || {});
 res.json({ ok:true, settings:getSettings() });
});

app.get("/api/services", (_req,res) => res.json(db.prepare("SELECT * FROM services ORDER BY sort_order,id").all()));
app.post("/api/services", (req,res) => {
 const {title,description="",price="",category="Design"} = req.body;
 if (!title?.trim()) return res.status(400).json({error:"Service title is required"});
 const info = db.prepare("INSERT INTO services(title,description,price,category) VALUES(?,?,?,?)").run(title.trim(),description,price,category);
 res.status(201).json(db.prepare("SELECT * FROM services WHERE id=?").get(info.lastInsertRowid));
});
app.put("/api/services/:id", (req,res) => {
 const {title,description="",price="",category="Design",active=1} = req.body;
 if (!title?.trim()) return res.status(400).json({error:"Service title is required"});
 db.prepare("UPDATE services SET title=?,description=?,price=?,category=?,active=? WHERE id=?").run(title.trim(),description,price,category,active?1:0,req.params.id);
 res.json({ok:true});
});
app.delete("/api/services/:id", (req,res) => { db.prepare("DELETE FROM services WHERE id=?").run(req.params.id); res.json({ok:true}); });

app.get("/api/leads", (_req,res) => res.json(db.prepare("SELECT * FROM leads ORDER BY id DESC").all()));
app.post("/api/leads", (req,res) => {
 const {name,company="",email="",source="Manual",status="New",value=0,notes=""} = req.body;
 if (!name?.trim()) return res.status(400).json({error:"Lead name is required"});
 const info = db.prepare("INSERT INTO leads(name,company,email,source,status,value,notes) VALUES(?,?,?,?,?,?,?)").run(name,company,email,source,status,Number(value)||0,notes);
 res.status(201).json(db.prepare("SELECT * FROM leads WHERE id=?").get(info.lastInsertRowid));
});
app.put("/api/leads/:id", (req,res) => {
 const {name,company="",email="",source="Manual",status="New",value=0,notes=""} = req.body;
 db.prepare("UPDATE leads SET name=?,company=?,email=?,source=?,status=?,value=?,notes=? WHERE id=?").run(name,company,email,source,status,Number(value)||0,notes,req.params.id);
 res.json({ok:true});
});
app.delete("/api/leads/:id", (req,res) => { db.prepare("DELETE FROM leads WHERE id=?").run(req.params.id); res.json({ok:true}); });

app.get("/api/projects", (_req,res) => res.json(db.prepare("SELECT * FROM projects ORDER BY id DESC").all()));
app.post("/api/projects", (req,res) => {
 const {name,client="",status="Planning",budget=0,currency="USD",deadline="",progress=0} = req.body;
 if (!name?.trim()) return res.status(400).json({error:"Project name is required"});
 const info = db.prepare("INSERT INTO projects(name,client,status,budget,currency,deadline,progress) VALUES(?,?,?,?,?,?,?)").run(name,client,status,Number(budget)||0,currency,deadline,Math.max(0,Math.min(100,Number(progress)||0)));
 res.status(201).json(db.prepare("SELECT * FROM projects WHERE id=?").get(info.lastInsertRowid));
});
app.put("/api/projects/:id", (req,res) => {
 const {name,client="",status="Planning",budget=0,currency="USD",deadline="",progress=0} = req.body;
 db.prepare("UPDATE projects SET name=?,client=?,status=?,budget=?,currency=?,deadline=?,progress=? WHERE id=?").run(name,client,status,Number(budget)||0,currency,deadline,Math.max(0,Math.min(100,Number(progress)||0)),req.params.id);
 res.json({ok:true});
});
app.delete("/api/projects/:id", (req,res) => { db.prepare("DELETE FROM projects WHERE id=?").run(req.params.id); res.json({ok:true}); });

app.get("/api/transactions", (_req,res) => res.json(db.prepare("SELECT * FROM transactions ORDER BY date DESC,id DESC").all()));
app.post("/api/transactions", (req,res) => {
 const {kind,description,amount,currency="USD",date} = req.body;
 if (!["income","expense"].includes(kind) || !description?.trim() || !(Number(amount)>0)) return res.status(400).json({error:"Valid type, description and positive amount are required"});
 const info = db.prepare("INSERT INTO transactions(kind,description,amount,currency,date) VALUES(?,?,?,?,COALESCE(?,date('now')))").run(kind,description,Number(amount),currency,date||null);
 res.status(201).json(db.prepare("SELECT * FROM transactions WHERE id=?").get(info.lastInsertRowid));
});
app.delete("/api/transactions/:id", (req,res) => { db.prepare("DELETE FROM transactions WHERE id=?").run(req.params.id); res.json({ok:true}); });

app.get("/api/dashboard", (_req,res) => {
 const leads = db.prepare("SELECT COUNT(*) n FROM leads").get().n;
 const projects = db.prepare("SELECT COUNT(*) n FROM projects WHERE status NOT IN ('Completed','Cancelled')").get().n;
 const income = db.prepare("SELECT COALESCE(SUM(amount),0) n FROM transactions WHERE kind='income' AND currency='USD'").get().n;
 const expenses = db.prepare("SELECT COALESCE(SUM(amount),0) n FROM transactions WHERE kind='expense' AND currency='USD'").get().n;
 const recentLeads = db.prepare("SELECT * FROM leads ORDER BY id DESC LIMIT 5").all();
 const recentProjects = db.prepare("SELECT * FROM projects ORDER BY id DESC LIMIT 5").all();
 res.json({leads,projects,income,expenses,profit:income-expenses,recentLeads,recentProjects});
});
app.get("/api/backup", (_req,res) => res.json({message:"Use the local data/kivo.db file for a complete backup.",database:"data/kivo.db"}));

const dist = path.resolve(__dirname,"../dist");
app.use(express.static(dist));
app.get("*", (req,res,next) => {
 if (req.path.startsWith("/api/")) return next();
 res.sendFile(path.join(dist,"index.html"), err => { if (err) next(); });
});
app.listen(PORT, () => console.log(`KIVO server running at http://localhost:${PORT}`));
