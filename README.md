# Name Correction Service

An HTTP backend that corrects ASR-mangled names and returns **recovery routing** for voice agents (e.g. Retell).

---

## Run locally

```bash
cd backend
npm install
npm start          # listens on PORT (default 3000)
```

Optional: set `OPENAI_API_KEY` for a **time-bounded** LLM rerank when local confidence is **low** only (keeps happy paths fast).

---

## Endpoint

### `POST /correct-name` (or `GET` with query string)

**Request** — required:

```json
{ "first_name": "suzan", "last_name": "obrien" }
```

Optional (for progressive recovery — pass from your voice flow on retries):

| Field | Description |
|-------|-------------|
| `attempt_number` | `1` first time, then `2`, `3`, … (query or JSON; POST merges body + query) |

**Response** — compact JSON:

```json
{
  "first_name": "Susan",
  "last_name": "O'Brien",
  "full_name": "Susan O'Brien",
  "confidence": "high",
  "low_confidence_flag": false,
  "next_action": "confirm",
  "recovery_strategy": "phonetic_map_hit"
}
```

### `confidence`

`high` \| `medium` \| `low` — conservative aggregate of first + last (worst side wins).

### `next_action`

One of:

| Value | When (deterministic) |
|-------|----------------------|
| `confirm` | High confidence |
| `repeat_slowly` | Medium confidence |
| `spell_last_name` | Low confidence, early attempts |
| `spell_full_name` | Low + more retries, both sides very uncertain, or missing first/last |
| `sms_fallback` | `attempt_number >= 6`, or low confidence after many tries |

### `low_confidence_flag`

`true` whenever `confidence` is not `high` (and for incomplete inputs).

### `recovery_strategy`

Short machine-readable tag (e.g. `phonetic_fuzzy_match`, `title_case_fallback_low`, `llm_rerank`) for logging / analytics.

---

## Retell: store fields as variables

| Response field | Example variable |
|----------------|------------------|
| `first_name` | `corrected_first` |
| `last_name` | `corrected_last` |
| `full_name` | `corrected_full` |
| `confidence` | `name_confidence` |
| `low_confidence_flag` | `needs_spelling` |
| `next_action` | `next_action` |
| `recovery_strategy` | `recovery_strategy` |

Branch the agent on **`next_action`**; use **`low_confidence_flag`** for softer confirmation copy.

---

## No PHI beyond names

Do not send DOB, MRN, address, etc. — only name strings (and optional `attempt_number`).
