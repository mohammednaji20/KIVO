import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "kivo.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS services (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
 price TEXT DEFAULT '', category TEXT DEFAULT 'Design', active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS leads (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT DEFAULT '', email TEXT DEFAULT '',
 source TEXT DEFAULT 'Website', status TEXT DEFAULT 'New', value REAL DEFAULT 0, notes TEXT DEFAULT '',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, client TEXT DEFAULT '', status TEXT DEFAULT 'Planning',
 budget REAL DEFAULT 0, currency TEXT DEFAULT 'USD', deadline TEXT DEFAULT '', progress INTEGER DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transactions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
 description TEXT NOT NULL, amount REAL NOT NULL, currency TEXT DEFAULT 'USD', date TEXT DEFAULT (date('now'))
);
`);

const defaults = {
 brandName: "KIVO", tagline: "Creative Studio",
 heroTitle: "Creative that makes your brand impossible to ignore.",
 heroDescription: "We build bold visual identities, engaging motion graphics, and digital experiences that help ambitious brands stand out.",
 heroButton: "Start a project", aboutTitle: "We turn ideas into visual experiences.",
 aboutDescription: "KIVO is an independent creative studio helping ambitious businesses communicate with clarity, character, and confidence.",
 email: "hello@kivo.studio", instagram: "https://instagram.com/", linkedin: "https://linkedin.com/",
 accent: "#ff5b43", announcement: "Independent creative studio · Working worldwide", language: "en"
};
const insertSetting = db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)");
for (const [k,v] of Object.entries(defaults)) insertSetting.run(k, String(v));

const count = db.prepare("SELECT COUNT(*) AS n FROM services").get().n;
if (!count) {
 const insert = db.prepare("INSERT INTO services(title,description,price,category,sort_order) VALUES(?,?,?,?,?)");
 [
  ["Brand Identity","Distinctive visual systems built around your story.","From $120","Branding",1],
  ["Digital Design","Social content and campaign visuals that move people.","From $45","Digital",2],
  ["Motion & Video","Motion graphics and product ads made to capture attention.","From $75","Motion",3]
 ].forEach(x => insert.run(...x));
}
export default db;
