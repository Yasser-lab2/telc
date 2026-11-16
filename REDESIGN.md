# Kolchi Klar redesign — report

Branch: `reskin/kolchi-klar` · Scope: **frontend only** (no backend, API or database change).

The whole app was re-skinned to the Kolchi Klar design (Stitch exports: light + dark, desktop + mobile).

## Design tokens

| Token | Light | Dark |
|---|---|---|
| Header | `#C40000` + 3px `#FFCC00` line | same |
| Primary CTA | `#C40000` | `#D21F17` |
| Accent | `#FFCC00` | `#FFCC00` |
| Background | `#FAF8F3` | `#121212` |
| Card | `#FFFFFF` | `#1B1B1B` |
| Border | `#D9D5C9` / `#E6E2D8` | `#333333` |
| Text / muted | `#1A1C1B` / `#55584F` | `#F5F3EE` / `#A8A49C` |

Fonts: Newsreader (headings), IBM Plex Sans / IBM Plex Sans Arabic (body), IBM Plex Mono (labels). Loaded from Google Fonts in `frontend/index.html`.

## Where things live

- `frontend/src/components/landing/landing.css` — **all** the new styling, scoped under `.kk` (light/dark via `html.dark`). Nothing outside `.kk` is touched.
- `frontend/src/components/landing/LandingChrome.tsx` — public header + footer (landing, pricing, legal, auth).
- `frontend/src/components/landing/AuthLayout.tsx` — shared shell for login / register / forgot / reset / verify.
- `frontend/src/components/landing/icons.tsx` — inline SVG icons (no icon font).
- `frontend/src/components/layout/DashboardLayout.tsx` — new app header (nav pills, language, theme, profile, payment, admin, logout). `/payment` and `/admin` now render inside it.

## Pages done

Landing · Login · Register · Forgot / Reset password · Verify email · Pricing · Legal · Dashboard · Lesen (catalogue + exercise) · Hören (catalogue + exercises + audio player) · Schreiben (catalogue + editor + score panel) · Sprechen · Simulation · Profil · Paiement · Admin (all 5 tabs).

## Two techniques worth knowing

1. **New markup + `kk-*` classes** for pages that were rewritten (landing, auth, dashboard, catalogues, Hören, Schreiben, Sprechen, Simulation).
2. **Utility remap layers** for big or legacy screens, to avoid rewriting ~1,500 lines of Tailwind:
   - `.kk-ex` re-maps the legacy dark utilities (`text-slate-400`, `border-white/10`, `bg-teal-300/10`…) used by `LesenExercise.tsx` to the palette.
   - `.kk-legacy` re-points the old theme tokens (`bg-surface`, `text-ink`, `bg-accent`…) for Profil / Paiement / Admin / Legal.
   - Both blocks were generated from the TSX class lists; they sit at the end of `landing.css`.

## i18n

New keys added in `fr`, `en` and `ar` (hero, stats, skills, footer, `alreadyHaveAccount`, …). RTL checked on Arabic.

## Verification

- `npm run typecheck -w frontend` and `npm run build -w frontend` pass.
- DOM audit of 22 routes, light + dark, at 350 / 375 / 768 / 1360 px and Arabic (RTL): no horizontal overflow and no leftover indigo / cyan / teal colours.

## Not verified (needs a human)

- Admin actions (approve payment, edit exam…).
- AI correction (needs a Gemini key in `backend/.dev.vars`).
- Real microphone recording on Sprechen.
- Result screens of Lesen / Hören, and `HorenExercise` (API-driven, no audio seeded locally).
- Screenshots were unreliable in the test pane, so the audit is DOM-based: please eyeball the pages in a real browser.

## Try it

```bash
npm install
npm run dev:api     # backend  :8787
npm run dev         # frontend :5173
```

Demo account (after `npm run db:demo`): `demo@telcprep.ma` / `Demo12345!`.
To open `/admin` you need an admin user: see `npm run admin:create -w backend`.
