import { Router } from "express";
import { isSupabaseConfigured, supabase } from "../config/supabase.js";

const router = Router();

/**
 * GET /api/health/db
 *
 * Runs a tiny real query against Supabase so the project registers activity
 * (free-tier projects are paused after ~7 days without any). Called on a
 * schedule by Vercel Cron (see vercel.json).
 *
 * If CRON_SECRET is set, the request must send `Authorization: Bearer <secret>`
 * (Vercel Cron adds this header automatically).
 */
router.get("/db", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ status: "unauthorized" });
    return;
  }

  if (!isSupabaseConfigured) {
    res.status(503).json({ status: "error", database: "not_configured" });
    return;
  }

  const started = Date.now();
  const { error } = await supabase.from("profiles").select("id").limit(1);

  if (error) {
    console.error("DB health check failed:", error.message);
    res.status(503).json({ status: "error", database: "unreachable" });
    return;
  }

  res.json({
    status: "ok",
    database: "reachable",
    latencyMs: Date.now() - started,
    timestamp: new Date().toISOString(),
  });
});

export default router;
