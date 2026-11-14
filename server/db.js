import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.");
}

// Server-only client. Never expose the service-role key to browser code.
const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const defaults = {
  brandName: "KIVO",
  tagline: "Creative Studio",
  heroTitle: "Creative that makes your brand impossible to ignore.",
  heroDescription: "We build bold visual identities, engaging motion graphics, and digital experiences that help ambitious brands stand out.",
  heroButton: "Start a project",
  aboutTitle: "We turn ideas into visual experiences.",
  aboutDescription: "KIVO is an independent creative studio helping ambitious businesses communicate with clarity, character, and confidence.",
  email: "hello@kivo.studio",
  instagram: "https://instagram.com/",
  linkedin: "https://linkedin.com/",
  accent: "#ff5b43",
  announcement: "Independent creative studio · Working worldwide",
  language: "en"
};

export async function initializeDatabase() {
  const { data: existing, error } = await db.from("settings").select("key").limit(1);
  if (error) throw new Error(`Supabase settings check failed: ${error.message}`);

  const rows = Object.entries(defaults).map(([key, value]) => ({ key, value: String(value) }));
  const { error: settingsError } = await db.from("settings").upsert(rows, { onConflict: "key", ignoreDuplicates: true });
  if (settingsError) throw new Error(`Supabase settings initialization failed: ${settingsError.message}`);

  const { count, error: countError } = await db.from("services").select("id", { count: "exact", head: true });
  if (countError) throw new Error(`Supabase services check failed: ${countError.message}`);
  if ((count ?? 0) === 0) {
    const { error: seedError } = await db.from("services").insert([
      { title: "Brand Identity", description: "Distinctive visual systems built around your story.", price: "From $120", category: "Branding", sort_order: 1 },
      { title: "Digital Design", description: "Social content and campaign visuals that move people.", price: "From $45", category: "Digital", sort_order: 2 },
      { title: "Motion & Video", description: "Motion graphics and product ads made to capture attention.", price: "From $75", category: "Motion", sort_order: 3 }
    ]);
    if (seedError) throw new Error(`Supabase services initialization failed: ${seedError.message}`);
  }
  return Boolean(existing);
}

export default db;
