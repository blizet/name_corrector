"use strict";
const express = require("express");
const { correctName } = require("./corrector");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => res.json({ status: "ok" }));

// ── Tunables ───────────────────────────────────────────────────────────────────
const LLM_ENABLED       = !!process.env.OPENAI_API_KEY;
const LLM_MODEL         = process.env.OPENAI_MODEL || "gpt-4o-mini";
const LLM_TIMEOUT_MS    = Number(process.env.LLM_TIMEOUT_MS || 800);
const CACHE_MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES || 5000);

// Per-field LRU (pair response is NOT cached — routing depends on attempt_number).
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

function correctCached(raw) {
  const key = (raw || "").toLowerCase();
  if (!key) return { corrected: "", confidence: "none", recovery_strategy: "empty" };
  const hit = cacheGet(key);
  if (hit) return hit;
  const r = correctName(raw);
  cacheSet(key, r);
  return r;
}

function toApiConfidence(c) {
  if (c === "exact" || c === "high") return "high";
  if (c === "medium") return "medium";
  return "low";
}

/** Worst of the two fields → API bucket high | medium | low */
function aggregateApiConfidence(c1, c2) {
  const o = { high: 2, medium: 1, low: 0 };
  const a = o[toApiConfidence(c1)] ?? 0;
  const b = o[toApiConfidence(c2)] ?? 0;
  const w = Math.min(a, b);
  return w === 2 ? "high" : w === 1 ? "medium" : "low";
}

function pairRecoveryStrategy(fr, lr) {
  const tags = [fr.recovery_strategy, lr.recovery_strategy];
  if (tags.includes("phonetic_map") && tags.includes("nysiis_fuzzy")) return "phonetic_hybrid";
  if (tags.includes("phonetic_map")) return "phonetic_map_hit";
  if (tags.includes("compound_prefix")) return "compound_prefix_repair";
  if (tags.includes("nysiis_fuzzy")) return "phonetic_fuzzy_match";
  if (tags.includes("token_level_compound")) return "token_level_compound";
  if (tags.includes("spelled_reconstruction")) return "spelled_reconstruction";
  if (tags.includes("title_case_fallback")) return "title_case_fallback";
  if (tags.includes("title_case_pass_through")) return "title_case_pass_through";
  if (tags.every(t => t === "empty")) return "empty_field";
  return "deterministic_pass";
}

function parseAttempt(body, query) {
  const raw = body.attempt_number ?? query.attempt_number ?? 1;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;
}

/**
 * Deterministic recovery routing (voice-safe).
 * Optional: pass attempt_number (1 = first pass). Escalates on retries.
 */
function computeRouting(apiConf, attempt, rawFirst, rawLast, fr, lr, llmUsed) {
  const att = attempt;
  const hasFirst = String(rawFirst || "").trim().length > 0;
  const hasLast  = String(rawLast  || "").trim().length > 0;
  const incomplete = !hasFirst || !hasLast;

  if (att >= 6) {
    return { next_action: "sms_fallback", recovery_strategy: "max_retry_sms" };
  }

  let recovery = pairRecoveryStrategy(fr, lr);
  if (llmUsed) recovery = recovery === "deterministic_pass" ? "llm_rerank" : `${recovery}+llm_rerank`;

  if (incomplete) {
    return {
      next_action:          "spell_full_name",
      recovery_strategy:    recovery + "_incomplete",
    };
  }

  if (apiConf === "high") {
    return { next_action: "confirm", recovery_strategy: recovery };
  }
  if (apiConf === "medium") {
    return { next_action: "repeat_slowly", recovery_strategy: recovery };
  }

  // low
  const bothTitleFallback =
    fr.recovery_strategy === "title_case_fallback" &&
    lr.recovery_strategy === "title_case_fallback";

  if (att >= 5) {
    return { next_action: "sms_fallback", recovery_strategy: recovery + "_low_exhausted" };
  }
  if (att >= 4 || bothTitleFallback) {
    return { next_action: "spell_full_name", recovery_strategy: recovery + "_very_low" };
  }
  if (att >= 3) {
    return { next_action: "spell_full_name", recovery_strategy: recovery + "_retry_low" };
  }
  return { next_action: "spell_last_name", recovery_strategy: recovery + "_low" };
}

function shouldCallLlm(c1, c2) {
  return aggregateApiConfidence(c1, c2) === "low";
}

async function buildResponse(rawFirst, rawLast, attempt) {
  const firstResult = correctCached(rawFirst);
  const lastResult  = correctCached(rawLast);

  let first = firstResult.corrected || titleCaseFallback(rawFirst);
  let last  = lastResult.corrected  || titleCaseFallback(rawLast);

  let llmUsed = false;
  if (LLM_ENABLED && shouldCallLlm(firstResult.confidence, lastResult.confidence)) {
    const llm = await llmCorrectPair(rawFirst, rawLast);
    if (llm && (llm.first_name || llm.last_name)) {
      first   = llm.first_name || first;
      last    = llm.last_name  || last;
      llmUsed = true;
    }
  }

  const apiConf = llmUsed
    ? "high"
    : aggregateApiConfidence(firstResult.confidence, lastResult.confidence);

  const route = computeRouting(
    apiConf,
    attempt,
    rawFirst,
    rawLast,
    firstResult,
    lastResult,
    llmUsed
  );

  const lowFlag = apiConf !== "high";

  return {
    first_name:           first,
    last_name:            last,
    full_name:            `${first} ${last}`.trim(),
    confidence:           apiConf,
    low_confidence_flag:  lowFlag,
    next_action:          route.next_action,
    recovery_strategy:    route.recovery_strategy,
  };
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
  const attempt = parseAttempt(req.body, req.query);
  return res.json(await buildResponse(rawFirst, rawLast, attempt));
}

async function handleGet(req, res) {
  const rawFirst = String(req.query.first_name || "").trim();
  const rawLast  = String(req.query.last_name  || "").trim();
  if (!rawFirst && !rawLast) {
    return res.status(400).json({ error: "first_name or last_name is required" });
  }
  const attempt = parseAttempt({}, req.query);
  return res.json(await buildResponse(rawFirst, rawLast, attempt));
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
