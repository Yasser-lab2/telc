# TELC Prep P0 MVP

Lightweight TELC B1/B2 preparation platform:

- Frontend: React 18 + Vite + TypeScript + Tailwind
- Backend: Hono on Cloudflare Workers
- Database: Cloudflare D1 with Drizzle ORM
- Auth: D1-backed httpOnly session cookie
- Payment: manual WhatsApp + CIH only
- AI grading: backend-only Google Gemini proxy

## Local Setup

```bash
npm install
```

Copy local env templates:

```bash
cp .env.example .env.local
cp backend/.dev.vars.example backend/.dev.vars
```

Apply the local D1 migration:

```bash
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0001_init.sql
```

Seed plans:

```bash
npm run db:seed -w backend
```

Copy the printed SQL and execute it with Wrangler, or run an equivalent `wrangler d1 execute --command`.

## Development

```bash
npm run dev -w backend
npm run dev -w frontend
```

Frontend: `http://localhost:5173`

Backend health: `http://localhost:8787/api/health`

## Checks

```bash
npm run typecheck
npm run build
```

Security checks used for P0:

```bash
grep -r "GEMINI" frontend/dist
```
