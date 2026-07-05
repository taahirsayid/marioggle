# Marioggle

A browser-based competitive word game inspired by Boggle. Find words on a shared 5×5 grid, score points, and beat the clock!

**Live demo:** https://taahirsayid.github.io/marioggle/

## Features (MVP in progress)

- Solo play vs computer (Easy / Medium / Hard)
- Private multiplayer rooms (2–6 players) — backend required
- Server-authoritative scoring, timer, and word validation
- SCOWL dictionary (free, attribution below)
- Responsive web UI for desktop, tablet, and mobile

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite → **GitHub Pages** |
| Backend | Node.js + Fastify + Socket.io → **Render free tier** |
| Game engine | `@marioggle/engine` (pure TypeScript, fully tested) |
| Dictionary | [SCOWL](http://wordlist.aspell.net/) size 60+ |

## Local development

```bash
npm install
npm run build:dictionary   # fetch SCOWL word list
npm run build -w @marioggle/shared
npm run build -w @marioggle/engine
npm run dev                # starts API :3001 + web :5173
```

Open http://localhost:5173/marioggle/

## Deployment

### Frontend (GitHub Pages)

Push to `main` — GitHub Actions builds and deploys to the `gh-pages` branch.

1. Go to **Settings → Pages**
2. Set **Source** to **Deploy from a branch**
3. Choose branch **`gh-pages`**, folder **`/ (root)`**
4. After the first workflow run completes, visit https://taahirsayid.github.io/marioggle/
5. Optionally set repository secret `VITE_API_URL` to your Render API URL (e.g. `https://marioggle.onrender.com`) and re-run the deploy workflow

### Backend (Render free tier)

1. Create a **Web Service** pointing at `apps/server`
2. Build: `npm install && npm run build:dictionary && npm run build -w @marioggle/shared && npm run build -w @marioggle/engine && npm run build -w @marioggle/server`
3. Start: `npm run start -w @marioggle/server`
4. Set `COOKIE_SECRET` and `PUBLIC_URL=https://taahirsayid.github.io/marioggle`

## Testing

```bash
npm test
```

## Dictionary attribution

Word lists derived from [SCOWL](http://wordlist.aspell.net/) (Spell Checker Oriented Word Lists) by Kevin Atkinson. See SCOWL licence for terms.

## Specification

See [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md) for the full technical spec mapped to every BRD requirement.

## Repository

https://github.com/taahirsayid/marioggle
