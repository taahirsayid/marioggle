# Marioggle

Browser-based competitive word game (5×5 Boggle-style grid).

- **Frontend:** GitHub Pages — https://taahirsayid.github.io/marioggle/
- **Backend API:** Render (free tier) — solo + multiplayer
- **Dictionary:** WordNet 3.1 via `wordnet-db`

## Quick start (play the game)

Follow **[RENDER_SETUP.md](./RENDER_SETUP.md)** — summary:

1. **Render:** Deploy `marioggle-api` from this repo. Set env vars when prompted (`COOKIE_SECRET` → Generate).
2. **GitHub secret:** Add `VITE_API_URL` = your Render URL (e.g. `https://marioggle-api.onrender.com`).
3. **GitHub Pages:** Settings → Pages → branch **`gh-pages`** / **root**.
4. Re-run **Deploy GitHub Pages** workflow.
5. Open https://taahirsayid.github.io/marioggle/ — wait for “Waking game server…” on first load (Render free tier).

## Local development

```bash
npm install
npm run build:dictionary
npm run dev
```

Open http://localhost:5173/marioggle/ (API on :3001).

## Testing solo

1. Open the site → **Play Solo**
2. Enter name, difficulty, duration → **Start Game**
3. After 3-second countdown, swipe/click words on the grid

## Testing multiplayer

1. **Player A:** Create Game → note the 6-digit code
2. **Player B:** Join Game (second browser/incognito) → enter code
3. **Player A:** In lobby → **Start Game** (needs 2+ players)
4. Both play on the same grid in real time

## Dictionary attribution

WordNet 3.1 — Princeton University. See WordNet licence terms.

## Specification

[TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md)
