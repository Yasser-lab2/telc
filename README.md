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
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0002_reading_exams.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0003_learning_core.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0004_seed_listening_writing.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0005_activity_idempotency.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0006_writing_drafts.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0007_reading_attempt_bridge.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0008_listening_policy.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0009_admin_audit.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0010_payment_workflow.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0011_account_security.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0012_user_preferences.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0013_legal_consents.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0014_simulation_foundation.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0015_subscription_payment_index.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0016_exam_readiness.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0017_ai_provider_metadata.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0018_speaking_recordings.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0019_speaking_review.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0020_growth_foundation.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0021_exam_library.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0022_pdf_b1_simulation.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0023_reading_section_sessions.sql
npx wrangler d1 execute telc-prep --local --config backend/wrangler.toml --file=backend/src/db/migrations/0024_zertify_lesen_catalog.sql
```

Migration `0021` imports the curated PDF exam library: one complete published B1
reading exam (Teil 1–3 and Sprachbausteine 1–2), writing prompts and speaking
prompts for Teil 1–3. The import is idempotent and keeps the admin JSON editor.
Migration `0022` publishes a free 125-minute B1 simulation using that reading
exam, a listening exercise and the Schwarzwald writing prompt.
Migration `0024` adds a second published B2 Lesen exam, structured with the same
five linked sections as the public Zertify sample (Teil 1–3 and Sprachbausteine
1–2). The Lesen catalog uses those linked section codes to make each category
tab show the matching two complete exams.

Seed plans:

```bash
npm run db:seed -w backend
```

Copy the printed SQL and execute it with Wrangler, or run an equivalent `wrangler d1 execute --command`.

### Demo data

After applying migrations `0001` through `0007`, populate a local showcase account and learning history:

```bash
npm run db:demo
```

Sign in with:

```text
Email: demo@telcprep.ma
Password: Demo12345!
```

The development-only seed is idempotent and includes an active subscription, a published reading test, completed reading/listening/writing attempts, dashboard progress, recent activity and writing feedback. Do not apply `backend/src/db/seeds/demo.sql` to production.

## Development

```bash
npm run dev -w backend
npm run dev -w frontend
```

Frontend: `http://localhost:5173`

Backend health: `http://localhost:8787/api/health`

Payment proofs use the private `PAYMENT_PROOFS` R2 binding. Wrangler simulates this bucket locally. Before deploying, create the production bucket and keep its name aligned with `backend/wrangler.toml`:

```bash
npx wrangler r2 bucket create telc-payment-proofs
```

### Extraction Hören de Zertify

Exécutez une commande séparée pour chaque onglet :

```bash
npm run scrape:zertify:horen:teil1
npm run scrape:zertify:horen:teil2
npm run scrape:zertify:horen:teil3
```

À chaque lancement, connectez-vous dans le navigateur, ouvrez l’onglet Teil demandé et son exercice, puis appuyez sur Entrée dans le terminal. Le script utilise `#hoeren-pdf-content` et produit respectivement `scraped/zertify-horen-teil1.json`, `scraped/zertify-horen-teil2.json` et `scraped/zertify-horen-teil3.json`, avec une capture PNG pour chaque partie.

Normalisez ensuite la partie extraite pour le frontend avec la commande correspondante, par exemple :

```bash
npm run normalize:zertify:horen:teil2
```

## Checks

```bash
npm run typecheck
npm run build
```

Production release, monitoring and D1 recovery procedures are documented in [`OPERATIONS.md`](./OPERATIONS.md).

Security checks used for P0:

```bash
grep -r "GEMINI" frontend/dist
```
