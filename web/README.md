# Naturalist Nurturer — Web App

The web frontend for Naturalist Nurturer, built with Next.js 16, React 19, and Tailwind CSS 4.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `XENO_CANTO_API_KEY` | Optional | Enables [Xeno-canto](https://xeno-canto.org) as the primary bird-sound source. Their v3 API (and audio downloads, since Oct 2025) require a free key — register at [xeno-canto.org/account](https://xeno-canto.org/account). Without it, bird sounds fall back to iNaturalist observation recordings. |

The key is used **server-side only** (in `/api/sounds` and `/api/sounds/audio`) and is never sent to the browser.

- **Local dev:** copy `.env.example` to `.env.local` and fill in the key (`.env.local` is gitignored).
- **Vercel:** add `XENO_CANTO_API_KEY` under Project → Settings → Environment Variables, then redeploy.

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## App Routes

| Route | Page |
|-------|------|
| `/` | Home — category selector, study launcher, welcome popup |
| `/study` | Flashcard study sessions |
| `/browse` | Field guide / species browser |
| `/progress` | Growth tracking & location map |
| `/api/sounds` | Bird sound search (iNaturalist sounds; Xeno-canto when `XENO_CANTO_API_KEY` is set) |
| `/api/sounds/audio` | Server-side audio proxy for hosts that block hotlinking |

## Deployment

Deployed on [Vercel](https://vercel.com) with automatic deploys from the `main` branch.
