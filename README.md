# WORQ Closure Helper

Web app that turns screenshots + a short description into:
- **Closure comments** (10+ words) describing the repair, to close out a work order.
- **WORQ request lines**, e.g. `WORQ MTS request to repair compressor` or
  `WORQ third party vendor needed to repair loose shingles`.

## Run
```
export ANTHROPIC_API_KEY=sk-ant-...   # optional; without it a simple template is used
export WORQ_EMAIL=community-box@example.com   # optional; enables the Email button
npm start     # http://localhost:3000
```
No dependencies (Node 18+). `npm test` runs the unit tests.

## Deploy
Hosted on Vercel (`api/` = serverless functions, `public/` = static site). The Vercel production
branch is `main`; pushing to `main` updates the live site. `server.js` is only for local use.

## Install on a phone (PWA)
- **Android (Chrome):** open the site, tap **Install app** (or the browser menu, then Install app).
- **iPhone (Safari):** tap Share, then **Add to Home Screen**.
The app keeps only its own files for quick opening. It never stores anything a technician types or any photo.
