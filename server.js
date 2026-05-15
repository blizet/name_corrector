"use strict";
const express = require("express");
const { correctName } = require("./corrector");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => res.json({ status: "ok" }));

// ── Tunables (override via env if you want) ──────────────────────────────────
const LLM_ENABLED       = !!process.env.OPENAI_API_KEY;
const LLM_MODEL         = process.env.OPENAI_MODEL || "gpt-4o-mini";
const LLM_TIMEOUT_MS    = Number(process.env.LLM_TIMEOUT_MS || 800);
const CACHE_MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES || 5000);

// ── Tiny LRU cache  (per-field, keyed by raw input, lowercased) ──────────────
const cache = new Map();
function cacheGet(k) {
  if (!cache.has(k)) return undefined;
  const v = cache.get(k);
  cache.delete(k);
  cache.set(k, v);
  return v;
}
function cacheSet(k, v) {
  if (cache.has(k)) cache.delete(k);
  cache.set(k, v);
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

function titleCaseFallback(s) {
  return s.split(/\s+/).map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}

// ── OpenAI rerank (only used when local engine is uncertain) ─────────────────
async function llmCorrectPair(rawFirst, rawLast) {
  if (!LLM_ENABLED) return null;

  const sys =
    "You are an ASR name corrector for a realtime voice system. " +
    "Given a likely-mistranscribed first and last name, return the most plausible correctly-spelled human first and last name. " +
    "Preserve apostrophes, hyphens, and multicultural spellings. " +
    "Do NOT invent unrelated names. Reply ONLY with compact JSON: " +
    `{"first_name":"...","last_name":"..."}`;

  const usr = JSON.stringify({ first_name: rawFirst, last_name: rawLast });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0,
        max_tokens: 64,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user",   content: usr },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content?.trim();
    if (!txt) return null;
    const parsed = JSON.parse(txt);
    const f = String(parsed.first_name || "").trim();
    const l = String(parsed.last_name  || "").trim();
    if (!f && !l) return null;
    return { first_name: f, last_name: l };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Correct a single field with cache ────────────────────────────────────────
function correctCached(raw) {
  const key = (raw || "").toLowerCase();
  if (!key) return { corrected: "", confidence: "none" };
  const hit = cacheGet(key);
  if (hit) return hit;
  const r = correctName(raw);
  cacheSet(key, r);
  return r;
}

function isUncertain(c) {
  return c === "low" || c === "none" || c === "medium";
}

async function buildResponse(rawFirst, rawLast) {
  const pairKey = `${(rawFirst || "").toLowerCase()}|${(rawLast || "").toLowerCase()}`;
  const cachedPair = cacheGet(pairKey);
  if (cachedPair) return cachedPair;

  const firstResult = correctCached(rawFirst);
  const lastResult  = correctCached(rawLast);

  const RANK = { exact: 4, high: 3, medium: 2, low: 1, none: 0 };
  const overallRaw =
    (RANK[firstResult.confidence] ?? 0) <= (RANK[lastResult.confidence] ?? 0)
      ? firstResult.confidence
      : lastResult.confidence;

  let first = firstResult.corrected || titleCaseFallback(rawFirst);
  let last  = lastResult.corrected  || titleCaseFallback(rawLast);
  let lowFlag = overallRaw === "low" || overallRaw === "none";

  // If the deterministic engine isn't confident, try the LLM (time-bounded).
  // The happy path NEVER hits this branch, so latency stays near zero.
  if (LLM_ENABLED && (isUncertain(firstResult.confidence) || isUncertain(lastResult.confidence))) {
    const llm = await llmCorrectPair(rawFirst, rawLast);
    if (llm && (llm.first_name || llm.last_name)) {
      first   = llm.first_name || first;
      last    = llm.last_name  || last;
      lowFlag = false;
    }
  }

  const out = {
    first_name:          first,
    last_name:           last,
    full_name:           `${first} ${last}`.trim(),
    low_confidence_flag: lowFlag,
  };
  cacheSet(pairKey, out);
  return out;
}

function pick(body, query, key) {
  const b = body[key];
  if (b !== undefined && b !== null && String(b).trim() !== "") return b;
  const q = query[key];
  if (q !== undefined && q !== null && String(q).trim() !== "") return q;
  return "";
}

async function handlePost(req, res) {
  const rawFirst = String(pick(req.body, req.query, "first_name")).trim();
  const rawLast  = String(pick(req.body, req.query, "last_name")).trim();
  if (!rawFirst && !rawLast) {
    return res.status(400).json({ error: "first_name or last_name is required" });
  }
  return res.json(await buildResponse(rawFirst, rawLast));
}

async function handleGet(req, res) {
  const rawFirst = String(req.query.first_name || "").trim();
  const rawLast  = String(req.query.last_name  || "").trim();
  if (!rawFirst && !rawLast) {
    return res.status(400).json({ error: "first_name or last_name is required" });
  }
  return res.json(await buildResponse(rawFirst, rawLast));
}

app.post("/correct-name", handlePost);
app.get("/correct-name", handleGet);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Name-correction service listening on port ${PORT}` +
      (LLM_ENABLED ? ` (LLM fallback: ${LLM_MODEL}, ≤${LLM_TIMEOUT_MS}ms)` : " (LLM fallback: disabled)")
    );
  });
}

module.exports = app;
