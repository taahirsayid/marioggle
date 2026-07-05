# Environment variables

## Render (backend API) — required

Create a **Web Service** from this repo (Render reads `render.yaml`).

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Set automatically by render.yaml |
| `COOKIE_SECRET` | *(auto-generated)* | Click **Generate** in Render dashboard if prompted |
| `PUBLIC_URL` | `https://taahirsayid.github.io/marioggle` | Used for invite links |
| `CORS_ORIGIN` | `https://taahirsayid.github.io` | Allows GitHub Pages frontend |
| `PORT` | *(set by Render)* | Do **not** set manually |

Word validation uses [Free Dictionary API](https://dictionaryapi.dev/) at runtime — no WordNet build step.

### Render service settings

- **Root directory:** leave blank (repo root)
- **Runtime:** Node
- **Build command:**
  ```
  npm install --include=dev && npm run build -w @marioggle/shared && npm run build -w @marioggle/engine && npm run build -w @marioggle/server
  ```
- **Start command:**
  ```
  node apps/server/dist/index.js
  ```
- **Health check path:** `/`

After deploy, copy your **exact** service URL from the Render dashboard (e.g. `https://marioggle.onrender.com` or `https://marioggle-api.onrender.com`).

---

## GitHub (frontend) — required

### Repository secret

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Example value |
|--------|---------------|
| `VITE_API_URL` | `https://marioggle.onrender.com` |

**Important:** `VITE_API_URL` must match your actual Render service URL exactly (no trailing slash). Re-run **Deploy GitHub Pages** after changing this secret.

### GitHub Pages

**Settings → Pages → Deploy from branch → `gh-pages` / (root)**

---

## Local development

Copy `.env.example` to `apps/web/.env.local`:

```
VITE_API_URL=http://localhost:3001
```

Run `npm run dev` from repo root.

---

## Free tier notes

- Render spins down after ~15 minutes idle. First request may take **30–60 seconds**.
- The frontend shows “Waking game server…” and retries automatically.
- Maximum **2 concurrent active games** on the server (per BRD).
