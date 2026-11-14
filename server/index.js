import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db, { initializeDatabase } from "./db.js";
import {
  authConfigured, verifyAdminPassword, createAdminToken, readAdminCookie,
  isValidAdminToken, setAdminCookie, clearAdminCookie, requireAdmin
} from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

let databaseReady;
const ensureDatabase = (_req, _res, next) => {
  databaseReady ||= initializeDatabase();
  databaseReady.then(() => next()).catch(next);
};

const run = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const result = async (res, query) => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return res.json(data);
};
const settingsObject = async () => {
  const { data, error } = await db.from("settings").select("key,value");
  if (error) throw new Error(error.message);
  return Object.fromEntries((data || []).map(({ key, value }) => [key, value]));
};

app.get("/api/health", run(async (_req, res) => {
  await initializeDatabase();
  res.json({ ok: true, app: "KIVO", database: "Supabase", authConfigured: authConfigured() });
}));
app.get("/api/auth/status", (_req, res) => res.json({
  configured: authConfigured(), authenticated: isValidAdminToken(readAdminCookie(_req))
}));

const attempts = new Map();
app.post("/api/auth/login", (req, res) => {
  if (!authConfigured()) return res.status(503).json({ error: "Admin authentication is not configured on the server." });
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempt = attempts.get(ip) || { count: 0, until: now + 900000 };
  if (now > attempt.until) { attempt.count = 0; attempt.until = now + 900000; }
  if (attempt.count >= 8) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  if (!verifyAdminPassword(req.body?.password || "")) {
    attempt.count++; attempts.set(ip, attempt);
    return res.status(401).json({ error: "Incorrect password." });
  }
  attempts.delete(ip);
  setAdminCookie(res, createAdminToken());
  res.json({ ok: true });
});
app.post("/api/auth/logout", (_req, res) => { clearAdminCookie(res); res.json({ ok: true }); });

app.use("/api", ensureDatabase);

app.get("/api/site", run(async (_req, res) => {
  const settings = await settingsObject();
  const { data, error } = await db.from("services").select("*").eq("active", 1).order("sort_order").order("id");
  if (error) throw new Error(error.message);
  res.json({ settings, services: data || [] });
}));
app.put("/api/site", requireAdmin, run(async (req, res) => {
  const allowed = ["brandName","tagline","heroTitle","heroDescription","heroButton","aboutTitle","aboutDescription","email","instagram","linkedin","accent","announcement"];
  const rows = allowed.filter(k => typeof req.body?.[k] === "string").map(key => ({ key, value: req.body[key].slice(0, 5000) }));
  if (rows.length) {
    const { error } = await db.from("settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  res.json({ ok: true, settings: await settingsObject() });
}));

app.get("/api/services", requireAdmin, run(async (_req,res) => result(res, db.from("services").select("*").order("sort_order").order("id"))));
app.post("/api/services", requireAdmin, run(async (req,res) => {
  const { title, description="", price="", category="Design" } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "Service title is required" });
  const { data, error } = await db.from("services").insert({ title:title.trim(), description, price, category }).select().single();
  if (error) throw new Error(error.message); res.status(201).json(data);
}));
app.put("/api/services/:id", requireAdmin, run(async (req,res) => {
  const { title, description="", price="", category="Design", active=1 } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "Service title is required" });
  const { error } = await db.from("services").update({ title:title.trim(), description, price, category, active:active?1:0 }).eq("id",req.params.id);
  if (error) throw new Error(error.message); res.json({ ok:true });
}));
app.delete("/api/services/:id", requireAdmin, run(async (req,res) => {
  const { error } = await db.from("services").delete().eq("id",req.params.id);
  if (error) throw new Error(error.message); res.json({ ok:true });
}));

app.get("/api/leads", requireAdmin, run(async (_req,res) => result(res,db.from("leads").select("*").order("id",{ascending:false}))));
app.post("/api/leads", requireAdmin, run(async (req,res) => {
  const { name, company="", email="", source="Manual", status="New", value=0, notes="" } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error:"Lead name is required" });
  const { data,error } = await db.from("leads").insert({name,company,email,source,status,value:Number(value)||0,notes}).select().single();
  if(error) throw new Error(error.message); res.status(201).json(data);
}));
app.put("/api/leads/:id", requireAdmin, run(async (req,res) => {
  const { name,company="",email="",source="Manual",status="New",value=0,notes="" } = req.body || {};
  const { error } = await db.from("leads").update({name,company,email,source,status,value:Number(value)||0,notes}).eq("id",req.params.id);
  if(error) throw new Error(error.message); res.json({ok:true});
}));
app.delete("/api/leads/:id", requireAdmin, run(async (req,res) => {
  const {error}=await db.from("leads").delete().eq("id",req.params.id); if(error) throw new Error(error.message); res.json({ok:true});
}));

app.get("/api/projects", requireAdmin, run(async (_req,res)=>result(res,db.from("projects").select("*").order("id",{ascending:false}))));
app.post("/api/projects", requireAdmin, run(async (req,res)=>{
  const {name,client="",status="Planning",budget=0,currency="USD",deadline="",progress=0}=req.body||{};
  if(!name?.trim()) return res.status(400).json({error:"Project name is required"});
  const {data,error}=await db.from("projects").insert({name,client,status,budget:Number(budget)||0,currency,deadline,progress:Math.max(0,Math.min(100,Number(progress)||0))}).select().single();
  if(error) throw new Error(error.message); res.status(201).json(data);
}));
app.put("/api/projects/:id", requireAdmin, run(async (req,res)=>{
  const {name,client="",status="Planning",budget=0,currency="USD",deadline="",progress=0}=req.body||{};
  const {error}=await db.from("projects").update({name,client,status,budget:Number(budget)||0,currency,deadline,progress:Math.max(0,Math.min(100,Number(progress)||0))}).eq("id",req.params.id);
  if(error) throw new Error(error.message); res.json({ok:true});
}));
app.delete("/api/projects/:id", requireAdmin, run(async (req,res)=>{
  const {error}=await db.from("projects").delete().eq("id",req.params.id); if(error) throw new Error(error.message); res.json({ok:true});
}));

app.get("/api/transactions", requireAdmin, run(async (_req,res)=>result(res,db.from("transactions").select("*").order("date",{ascending:false}).order("id",{ascending:false}))));
app.post("/api/transactions", requireAdmin, run(async (req,res)=>{
  const {kind,description,amount,currency="USD",date}=req.body||{};
  if(!["income","expense"].includes(kind)||!description?.trim()||!(Number(amount)>0)) return res.status(400).json({error:"Valid type, description and positive amount are required"});
  const row={kind,description,amount:Number(amount),currency}; if(date) row.date=date;
  const {data,error}=await db.from("transactions").insert(row).select().single();
  if(error) throw new Error(error.message); res.status(201).json(data);
}));
app.delete("/api/transactions/:id", requireAdmin, run(async (req,res)=>{
  const {error}=await db.from("transactions").delete().eq("id",req.params.id); if(error) throw new Error(error.message); res.json({ok:true});
}));

app.get("/api/dashboard", requireAdmin, run(async (_req,res)=>{
  const [leads,projects,income,expenses,recentLeads,recentProjects]=await Promise.all([
    db.from("leads").select("id",{count:"exact",head:true}),
    db.from("projects").select("id",{count:"exact",head:true}).not("status","in",'("Completed","Cancelled")'),
    db.from("transactions").select("amount").eq("kind","income").eq("currency","USD"),
    db.from("transactions").select("amount").eq("kind","expense").eq("currency","USD"),
    db.from("leads").select("*").order("id",{ascending:false}).limit(5),
    db.from("projects").select("*").order("id",{ascending:false}).limit(5)
  ]);
  for(const x of [leads,projects,income,expenses,recentLeads,recentProjects]) if(x.error) throw new Error(x.error.message);
  const total=a=>(a.data||[]).reduce((n,x)=>n+Number(x.amount||0),0);
  const inc=total(income), exp=total(expenses);
  res.json({leads:leads.count||0,projects:projects.count||0,income:inc,expenses:exp,profit:inc-exp,recentLeads:recentLeads.data||[],recentProjects:recentProjects.data||[]});
}));

if (process.env.VERCEL !== "1") {
  const dist = path.resolve(__dirname,"../dist");
  app.use(express.static(dist));
  app.get("*",(req,res,next)=>{
    if(req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(dist,"index.html"),error=>{if(error)next();});
  });
  app.listen(PORT,()=>console.log("KIVO server running on port "+PORT));
}

app.use((err,_req,res,_next)=>{
  console.error("KIVO API error:",err.message);
  res.status(500).json({error:process.env.NODE_ENV==="production"?"Internal server error":err.message});
});

export default app;
