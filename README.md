# Name Correction Service

An HTTP backend that corrects ASR-mangled names.  
Retell calls it as a **Custom Function Tool** — zero custom code inside Retell.

---

## Run locally

```bash
cd backend
npm install
npm start          # listens on PORT (default 3000)
```

Set `PORT` env var to change the port.

---

## Endpoint

### `POST /correct-name` (or `GET` with query string)

**Request** — only these two fields are needed (JSON body and/or query params; POST merges both):

```json
{ "first_name": "suzan", "last_name": "obrien" }
```

In Retell (no trailing comma after the last property):

```json
{ "first_name": "{{first_name}}", "last_name": "{{last_name}}" }
```

**Response** — four fields only:

```json
{
  "first_name": "Susan",
  "last_name": "O'Brien",
  "full_name": "Susan O'Brien",
  "low_confidence_flag": false
}
```

`low_confidence_flag` is `true` when the engine is unsure (weak side of first vs last confidence). Use it in Retell to branch to a spell-out or softer confirm path.

---

## Retell integration (step-by-step)

### 1. Deploy this service

Any public HTTPS URL works. Quick options:

| Platform | Command |
|----------|---------|
| **Railway** | `railway up` in the `backend/` folder |
| **Render** | Connect repo, set start command `node server.js` |
| **Fly.io** | `fly launch` then `fly deploy` |

Your deployed URL will look like `https://your-app.railway.app`.

### 2. Add a Custom Function in Retell

1. In Retell, go to **Functions → Add Function**.
2. Fill in:
   - **Name**: e.g. `Name correction`
   - **URL**: `https://your-app.railway.app/correct-name`
   - **Method**: `POST`
   - **Header**: `Content-Type` = `application/json`
3. Pass **`first_name`** and **`last_name`** (body JSON and/or query — both work on POST).
4. **Store fields as variables** (example):

   | Response field | Variable |
   |----------------|----------|
   | `first_name` | `corrected_first` |
   | `last_name` | `corrected_last` |
   | `full_name` | `corrected_full` |
   | `low_confidence_flag` | `needs_spelling` |

### 3. Wire it into your call flow

If `needs_spelling` is false → normal confirmation with `corrected_first` / `corrected_last`.  
If true → spell-out or repeat branch.

### 4. No PHI beyond name

This service accepts and returns **only name fields** plus the boolean flag above.  
Do not pass DOB, MRN, address, or any other identifiers.
