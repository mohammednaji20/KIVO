import React, { useEffect, useState } from "react";

export default function App() {
  const [site, setSite] = useState({settings:{brandName:"KIVO",tagline:"Creative Studio",heroTitle:"Creative that makes your brand impossible to ignore.",heroDescription:"We build bold visual identities, engaging motion graphics, and digital experiences that help ambitious brands stand out.",heroButton:"Start a project",email:"hello@kivo.studio"},services:[]});
  const [dashboard, setDashboard] = useState(false);
  const [health, setHealth] = useState("Connecting…");

  useEffect(() => {
    fetch("/api/health").then(r=>r.json()).then(()=>setHealth("API connected")).catch(()=>setHealth("API unavailable"));
    fetch("/api/site").then(r=>r.json()).then(setSite).catch(()=>{});
  }, []);

  const s=site.settings||{};
  return <main className="site">
    <header className="nav"><a className="logo" href="#">KIVO<span>.</span></a><nav><a href="#services">Services</a><a href="#about">About</a><a href="#contact">Contact</a></nav><button onClick={()=>setDashboard(!dashboard)}>{dashboard?"View website":"KIVO OS"}</button></header>
    {dashboard ? <section className="dashboard"><p className="eyebrow">WORKSPACE / OVERVIEW</p><h1>KIVO OS</h1><p>Your creative studio workspace.</p><div className="status">{health}</div><div className="tiles"><article><b>Services</b><strong>{site.services?.length||0}</strong></article><article><b>Workspace</b><strong>Ready</strong></article><article><b>Platform</b><strong>MVP</strong></article></div><p className="notice">This is the initial local-first MVP. Admin authentication and cloud database integration are not enabled yet. Do not expose administrative APIs publicly.</p></section> :
    <><section className="hero"><p className="eyebrow">{s.tagline||"INDEPENDENT CREATIVE STUDIO"}</p><h1>{s.heroTitle}</h1><p className="intro">{s.heroDescription}</p><a className="cta" href="#contact">{s.heroButton||"Start a project"} ↗</a><div className="art"><span>IDEAS INTO IMPACT</span><b>K<span>.</span></b></div></section>
    <section id="services" className="section"><p className="eyebrow">WHAT WE DO</p><h2>Creative services<span>.</span></h2><div className="cards">{(site.services||[]).map(x=><article key={x.id}><small>{x.category}</small><h3>{x.title}</h3><p>{x.description}</p><b>{x.price}</b></article>)}</div></section>
    <section id="about" className="about"><p className="eyebrow">ABOUT KIVO</p><h2>We turn ideas into visual experiences.</h2><p>An independent creative studio helping ambitious businesses communicate with clarity, character, and confidence.</p></section>
    <section id="contact" className="section contact"><p className="eyebrow">HAVE A PROJECT?</p><h2>Let's make something matter<span>.</span></h2><a className="cta" href={`mailto:${s.email||"hello@kivo.studio"}`}>Start a conversation ↗</a></section></>}
    <footer>© {new Date().getFullYear()} KIVO Creative Studio <span>{health}</span></footer>
  </main>;
}