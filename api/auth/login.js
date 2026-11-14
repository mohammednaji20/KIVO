import { authConfigured, verifyAdminPassword, createAdminToken, setAdminCookie } from "../../server/auth.js";

const attempts = new Map();

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!authConfigured()) {
    return res.status(503).json({ error: "Admin authentication is not configured on the server." });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempt = attempts.get(ip) || { count: 0, until: now + 900000 };
  if (now > attempt.until) {
    attempt.count = 0;
    attempt.until = now + 900000;
  }
  if (attempt.count >= 8) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }

  if (!verifyAdminPassword(req.body?.password || "")) {
    attempt.count++;
    attempts.set(ip, attempt);
    return res.status(401).json({ error: "Incorrect password." });
  }

  attempts.delete(ip);
  setAdminCookie(res, createAdminToken());
  return res.status(200).json({ ok: true });
}
