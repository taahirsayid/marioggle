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

Render will also run `npm run build:dictionary` which loads **WordNet** from the `wordnet-db` npm package.

### Render service settings

- **Root directory:** leave blank (repo root)
- **Runtime:** Node
- **Build command:**
  ```
  npm install --include=dev && npm run build:dictionary && npm run build -w @marioggle/shared && npm run build -w @marioggle/engine && npm run build -w @marioggle/server
  ```
- **Start command:**
  ```
  node apps/server/dist/index.js
  ```
- **Health check path:** `/` (or `/api/health` — both respond immediately on startup)

After deploy, copy your service URL (e.g. `https://marioggle-api.onrender.com`).

---

## GitHub (frontend) — required

### Repository secret

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Example value |
|--------|---------------|
| `VITE_API_URL` | `https://marioggle-api.onrender.com` |

No trailing slash. Re-run **Deploy GitHub Pages** workflow after adding this secret.

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
