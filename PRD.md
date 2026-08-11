# Product Requirements Document — TELC Prep Professional

**Status:** Proposed  
**Version:** 1.0  
**Date:** 2026-08-07  
**Product:** Mobile-first TELC B1/B2 preparation platform for learners in Morocco

## Implementation status

- **Phase 0 — Complete:** shared visual tokens, responsive learner navigation, localization foundation and CI baseline started on 2026-08-07. Home, pricing, authentication and the primary dashboard were migrated to the professional light design on 2026-08-08; fake dashboard progress/activity was removed pending real attempt data. The additive shared content, media, attempt, progress and activity schema was introduced in migration `0003_learning_core.sql` on 2026-08-08.
- **Phase 1 — Complete:** the shared content repository/read API was added and the existing listening and writing exercises were migrated from hard-coded runtime data into D1 in migration `0004_seed_listening_writing.sql`. The reading JSON import/editor remains supported.
- Persistent listening attempts, answer saving, server-side scoring, idempotent progress/activity updates and the first real dashboard progress read model were added on 2026-08-08.
- Payment history and proof upload were made directly discoverable from authenticated desktop and mobile navigation on 2026-08-11.
- Persistent writing drafts, AI-linked shared attempts, revision creation, submission history and immediate progress refresh were added on 2026-08-08.
- Reading sessions were bridged into shared attempts, progress and activity on 2026-08-08 without removing or changing the JSON exam import/editor.
- A repeatable local demonstration dataset was added on 2026-08-08 to showcase subscriptions, reading content, cross-skill progress, recent activity and writing feedback without placing mock records in production migrations.
- The production reading workspace gained active-session recovery, a synchronized countdown, debounced answer autosave, answered-question status and guarded/automatic submission on 2026-08-08.
- Reading results gained section breakdowns, question explanations, unanswered review, retry navigation and a five-attempt score trend on 2026-08-08.
- Listening gained answer-key privacy, persisted playback limits, active-session recovery, autosave, server-side review/transcript release and attempt history on 2026-08-08.
- Admins gained a form-based Hören/Schreiben content editor on 2026-08-08; the Lesen JSON editor/import remains unchanged and available.
- Detailed user administration, guarded role changes, subscription extension/cancellation and persistent admin audit logging were added on 2026-08-08.
- Manual payments gained private proof uploads, user-visible status timelines, rejection reasons, duplicate protections and audited admin decisions on 2026-08-08.
- Account security gained email verification, password recovery, database-backed rate limits and user-controlled session management on 2026-08-08.
- Learners gained validated self-service profile editing for their display name and target TELC level on 2026-08-08.
- Profile access was made explicit in desktop/mobile navigation and remains available to authenticated users after subscription expiry on 2026-08-09.
- Learners gained portable JSON data export and password-confirmed account deletion, including removal of private payment proofs, on 2026-08-09.
- Account-level language, study-reminder and product-update preferences gained persistent self-service settings on 2026-08-09.
- Versioned legal consent plus public privacy, terms and refund-policy flows were added on 2026-08-10; operator identity, retention periods and CNDP formalities remain launch blockers requiring professional validation.
- Role-based access control was expanded on 2026-08-11 with least-privilege support and content-editor roles, centralized API permissions and permission-aware administration navigation.
- The admin operational dashboard gained explicit 7-day and 30-day acquisition, learning, subscription, payment, AI latency and content-pipeline metrics on 2026-08-11.
- Structured request logging, traceable error responses, dependency-aware health checks, a UI error boundary, automated RBAC/exam/health/accessibility tests, migration rehearsal and a recovery runbook were added on 2026-08-11.
- **Phase 2 — Engineering complete:** the repository implementation is complete. Production release approval remains conditional on operator identity/contact details, CNDP formalities, final legal review, external alert destinations and recorded manual WCAG/responsive QA. Phase 4 has not started.
- **Phase 3 — Engineering complete:** persistent timed simulation blueprints, sequential cross-skill sessions, child-attempt verification, weighted scoring, history and admin publishing are implemented. Evidence-based readiness uses explicit preliminary/reliable confidence; the dashboard now includes a database-backed weekly goal, score trends, weak-skill recommendations and a reviewable mistake notebook. Admin content analytics report real starts, completions, abandonment and average scores. Completed on 2026-08-12.

## 1. Executive summary

TELC Prep is now a database-backed learning and commercial platform combining reading, listening and AI-assisted writing practice with persistent attempts, measurable progress, content administration, account security, role-based operations and manual Moroccan payment handling. Phase 2 engineering is complete; full simulations, readiness guidance, speaking practice and growth work remain in Phases 3–4.

The next version should become a credible, professional exam-preparation product: a consistent multilingual interface, authentic timed practice, persistent learner progress, actionable correction and review, a unified content-management system, and a reliable commercial/admin workflow.

## 2. Existing product audit

### 2.1 Implemented functionality

| Area | Current capability | Implementation status |
|---|---|---|
| Public website | Landing page, pricing page, navigation and footer | Functional, basic presentation |
| Authentication | Email/password registration, login, logout, httpOnly database sessions | Functional |
| Learner level | B1, B2, or B1+B2 selected during registration | Stored, minimally used |
| Trial/subscriptions | Trial created on registration; active plan and expiry gate the dashboard | Functional |
| Plans | Active plans returned from database with duration, MAD price and daily AI quota | Functional |
| Payments | User creates manual payment request, opens a pre-filled WhatsApp/CIH flow, and sees request history | Functional but operationally manual |
| Payment administration | Admin lists pending requests and approves/rejects them; approval creates a subscription | Functional, minimal safeguards/UX |
| Reading library | Lists published database-backed exams with free/premium access | Functional |
| Reading exam | Starts/resumes a session, selects answers, saves, submits, scores by section, and shows corrections | Functional foundation |
| Reading CMS | Admin creates metadata, imports/edits exam JSON, validates, publishes, unpublishes and deletes | Functional but not editor-friendly |
| Listening | Lists two hard-coded audio exercises, plays remote audio, answers MCQs and calculates a browser-only score | Demo-level |
| Writing | Lists three hard-coded prompts and accepts a response | Functional foundation |
| AI grading | Server-side Gemini grading, structured scores/feedback/improved text, persisted submissions and daily quota | Functional |
| Usage | Shows daily AI limit, used and remaining credits | Functional |
| Admin overview | Total users, subscription status counts and daily AI usage | Functional, basic |
| Access control | Auth, subscription and admin middleware plus protected frontend routes | Functional |

### 2.2 Partial, static, or missing functionality

- Dashboard progress percentages, exercise totals, recent activity, weekly goal and next-step recommendation are hard-coded.
- Simulation is a placeholder and does not run an exam.
- Admin user management is a placeholder.
- Reading search, filters, categories and B2 selector are visual controls without behavior; the B2 UI is disabled even though the model supports B2 exams.
- Listening answers and scores are not persisted; its content and public audio URLs are hard-coded and are not a real CMS workflow.
- Writing prompts are hard-coded. Learners cannot view submission history, reopen feedback, compare drafts, or deliberately practise errors.
- Reading sessions do not expose a visible countdown, robust resume flow, answer completeness check, history, detailed explanations, or learner analytics.
- Profile is read-only and contains only email and level.
- No password reset, email verification, account deletion/export, notification preferences, or session management.
- Payment proof fields exist in the schema but there is no proof upload flow. There is no duplicate-request prevention, searchable history, admin note workflow, or automated payment provider.
- No listening/speaking CMS and no speaking module. Speaking is a core exam skill and should be introduced after the learning core is reliable.
- No automated test suite, CI workflow, product analytics, error monitoring, audit log, accessibility review, or documented backup/restore process is visible in the repository.
- UI language is inconsistent (French, German and occasional English labels). Public pages use a light visual language while the learner dashboard uses a separate dark visual language.

### 2.3 Current technologies

| Layer | Technology |
|---|---|
| Repository | npm workspaces monorepo |
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer, custom CSS variables |
| Routing | React Router 6 |
| Server state | TanStack React Query 5 |
| Client state | Zustand 5 |
| Backend/API | Hono 4 on Cloudflare Workers |
| Database | Cloudflare D1 / SQLite |
| ORM and migrations | Drizzle ORM and Drizzle Kit |
| Validation | Zod |
| Authentication | bcryptjs password hashing, nanoid identifiers, D1-backed httpOnly cookie sessions |
| AI | Google Gemini through a backend-only integration |
| Deployment tooling | Wrangler |
| Payments/communication | Manual CIH transfer and generated WhatsApp link |
| Native media | HTML5 audio with externally hosted demo MP3 files |

### 2.4 Product and engineering risks

1. **Learning-value risk:** static dashboard data can mislead learners and weakens trust.
2. **Content scalability risk:** hard-coded listening/writing content and JSON-only reading editing make publishing slow and error-prone.
3. **Exam-authenticity risk:** no complete timed simulation, speaking practice, or durable performance history.
4. **Revenue-operations risk:** payment approval is manual and lacks proof handling, reconciliation, audit logs and idempotency protections.
5. **Security risk:** authentication has no recovery/verification flow; rate limiting, CSRF strategy, audit logging and session revocation need explicit review.
6. **Quality risk:** there are no automated tests or CI gates. Build verification also depends on installing the repository dependencies.
7. **Brand risk:** inconsistent visual systems and languages make the product feel like an MVP rather than a coherent service.

## 3. Product vision and positioning

**Vision:** Help a TELC learner understand exactly what to practise next, train under realistic conditions, and reach exam readiness with clear evidence of improvement.

**Primary market:** Mobile-first learners in Morocco preparing for TELC B1 or B2, with French as the primary support language and German retained for exam content.

**Value proposition:** Authentic TELC-style practice, useful AI-supported correction, personal progress guidance, and locally convenient payment in one affordable experience.

## 4. Goals and non-goals

### Goals

- Make every progress number real, persistent and explainable.
- Deliver polished practice for Lesen, Hören and Schreiben and a full timed simulation.
- Provide a unified CMS so admins can create and publish content without editing JSON.
- Turn results into a review loop: error explanation, saved mistakes, retry and recommendation.
- Create a coherent, accessible, responsive visual identity.
- Improve subscription conversion and reduce manual payment support effort.
- Establish production fundamentals: automated tests, observability, security controls and backups.

### Non-goals for the first professional release

- Reproducing copyrighted official TELC exams without licensing.
- Native iOS or Android applications; the responsive web app is the first target.
- A live tutor marketplace or social network.
- Fully autonomous AI content publishing without human review.
- Supporting levels outside B1/B2.

## 5. Users and key jobs

### Learner

- Discover whether the platform matches their level and exam date.
- Start the right practice quickly on a phone.
- Train one skill or take a realistic simulation.
- Understand mistakes and know what to do next.
- Track readiness over time and maintain a study routine.
- Subscribe and confirm payment with minimal uncertainty.

### Content administrator

- Create, preview, validate and publish exercises across all skills.
- Manage media and prevent answers from leaking before submission.
- Update content without a deployment.

### Operations administrator

- Review payment proof, approve/reject safely, manage users/subscriptions and investigate support cases.
- Monitor content engagement, AI costs and conversion.

## 6. Information architecture

### Public

- Home
- How it works
- Exam modules
- Pricing
- FAQ
- Login / registration / password recovery
- Legal: terms, privacy, cookies and refund policy

### Learner app

- Today
- Practice
  - Lesen
  - Hören
  - Schreiben
  - Sprechen (later release)
- Simulations
- Review / mistake notebook
- Progress
- Subscription and payments
- Profile and settings

### Admin

- Overview
- Content library and editors
- Users
- Payments and subscriptions
- AI usage/cost
- Product analytics
- Audit log and settings

## 7. Functional requirements

Priority uses **P0** for the professional launch, **P1** for the next high-value release, and **P2** for later differentiation.

### 7.1 Onboarding, authentication and profile

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| AUTH-01 | P0 | Guided registration captures name, email, password, target level, exam date and weekly goal | Data persists; validation and errors are accessible; onboarding can be completed on a 360 px screen |
| AUTH-02 | P0 | Email verification and password reset | Tokens expire, are single-use, and successful reset revokes existing sessions |
| AUTH-03 | P0 | Editable profile and language preference | Learner can update name, level, exam date, UI language and study goal |
| AUTH-04 | P0 | Session and account controls | Learner can log out all devices, export data and request account deletion |
| AUTH-05 | P1 | Optional social sign-in | Account linking avoids duplicate users and preserves subscription/history |

### 7.2 Personalized dashboard

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| DASH-01 | P0 | Replace every static metric with database-derived data | Global/skill progress, attempts, average score, streak, AI quota and recent activity match stored events |
| DASH-02 | P0 | Continue-learning card | Returns the latest resumable session or a recommended next exercise |
| DASH-03 | P0 | Weekly goal and readiness summary | Learner can set a goal; completed work updates it; readiness explains its calculation |
| DASH-04 | P1 | Personalized recommendations | Recommendations use level, weak sections, recency and completed content; learner can dismiss one |

### 7.3 Unified practice engine and CMS

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| CNT-01 | P0 | Store reading, listening and writing content in D1 using shared content metadata | Admin changes appear without deployment; content supports B1/B2, tags, difficulty, access tier and publication state |
| CNT-02 | P0 | Form-based content editor | Admin can create questions/options/prompts, reorder items, save drafts, preview as learner and publish without JSON |
| CNT-03 | P0 | Media library | Admin uploads audio/images to object storage, sees usage and metadata, and can replace assets safely |
| CNT-04 | P0 | Validation and lifecycle | Publishing rejects incomplete/invalid scoring; draft, scheduled, published and archived states are supported |
| CNT-05 | P1 | Import/export and versioning | Admin can import validated JSON/CSV, export content and restore a previous version |
| CNT-06 | P1 | Content analytics | Per exercise: starts, completion, average score, item difficulty and abandonment |

### 7.4 Reading

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| READ-01 | P0 | Functional search/filter/sort by level, section, completion and difficulty | URL reflects filters; empty/loading/error states are provided |
| READ-02 | P0 | Timed, persistent attempt | Visible timer, autosave, reload/device resume, answered count and submit confirmation work reliably |
| READ-03 | P0 | Rich result review | Shows total and section score, correct answer, explanation, unanswered items and retry/review actions |
| READ-04 | P0 | Attempt history | Learner sees previous attempts and score trend without exposing answers before submission |

### 7.5 Listening

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| LISTEN-01 | P0 | Database-backed listening exams and durable attempts | Answers, playback policy, time and scores persist; hard-coded demo content is removed from production paths |
| LISTEN-02 | P0 | Exam-aware audio player | Supports play-count limits where configured, progress, keyboard controls, loading/error states and accessible labels |
| LISTEN-03 | P0 | Post-submit review | Transcript and explanations are hidden until submission and then shown according to content policy |
| LISTEN-04 | P1 | Listening analytics | Tracks weak question types and playback behavior without storing unnecessary personal data |

### 7.6 Writing and AI feedback

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| WRITE-01 | P0 | Database-backed prompt library | Filter by level, task type and completed state; prompts are admin-managed |
| WRITE-02 | P0 | Professional editor | Autosave draft, word count, timer, prompt checklist and leave-page protection |
| WRITE-03 | P0 | Structured feedback aligned to a documented rubric | Overall/criterion scores, corrections, suggestions, improved example and concise French explanation render consistently |
| WRITE-04 | P0 | Submission history and revision | Learner can reopen feedback, revise, resubmit and compare versions; each AI call respects quota |
| WRITE-05 | P0 | Safe AI operation | Schema validation, timeout/retry, prompt/version logging, abuse limits, graceful failure and no secret in frontend |
| WRITE-06 | P1 | Mistake notebook | Learner saves recurring grammar/vocabulary issues and marks them reviewed |

### 7.7 Simulation

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| SIM-01 | P0 | Full B1/B2 simulation composed from published content | Configuration defines sections, order, duration and scoring; only compatible content can be selected |
| SIM-02 | P0 | Exam mode | One timer, autosave, navigation overview, interruption recovery and final-submit confirmation |
| SIM-03 | P0 | Results and readiness impact | Shows skill/section breakdown after submission and updates progress/readiness once only |
| SIM-04 | P1 | Scheduled practice plan | Learner can schedule a simulation and receive an opted-in reminder |

### 7.8 Payments and subscriptions

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| PAY-01 | P0 | Improved manual payment flow | Clear CIH instructions, reference, copy actions, proof upload, status timeline and expected review time |
| PAY-02 | P0 | Safe admin reconciliation | Search/filter requests, inspect proof, add internal note, approve/reject with reason; repeat action cannot create duplicate subscription |
| PAY-03 | P0 | Subscription management | Learner sees entitlement, expiry, payment history and renewal CTA; admins can extend/cancel with an audit entry |
| PAY-04 | P1 | Online payment provider suitable for Morocco | Webhook is verified and idempotent; manual payment remains fallback |
| PAY-05 | P1 | Notifications | Opted-in confirmation for received, approved, rejected and expiring states |

### 7.9 Admin and support

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| ADM-01 | P0 | User table and detail page | Search/filter, view status/activity/payments, change level/role with permission checks, and manage subscription |
| ADM-02 | P0 | Role-based authorization | At least super-admin, content editor and support roles; UI and API both enforce permissions |
| ADM-03 | P0 | Audit log | Sensitive admin actions record actor, target, action, timestamp and non-secret change metadata |
| ADM-04 | P0 | Operational dashboard | Shows activation backlog, active learners, completion, conversion and AI usage/cost with defined date ranges |

## 8. New design direction

### Brand concept: “Calm exam confidence”

Use a focused academic identity rather than a generic dark dashboard. The interface should feel trustworthy and energetic without looking like a game or an AI demo.

- **Palette:** warm off-white canvas, deep ink/navy text, teal as the primary action, and restrained amber/coral for attention and feedback. Dark mode may follow after the light system is complete.
- **Typography:** a legible modern sans-serif with strong German character support; one display face may be used sparingly on marketing pages.
- **Surfaces:** clear hierarchy, moderate radius, subtle borders and shadows; reduce decorative gradients and avoid separate visual systems between public and authenticated pages.
- **Imagery:** authentic study/exam moments and simple custom illustrations; do not rely on flags or stereotypical imagery.
- **Iconography:** one consistent outlined icon family, never letters such as `Q`, `AI`, or `B1` as substitutes when an icon has semantic value.

### UX principles

1. One primary action per screen.
2. Show state clearly: not started, in progress, completed, needs review and locked.
3. Keep German exam content visually distinct from French support text.
4. Explain scores, access restrictions and AI limits instead of only displaying numbers.
5. Design mobile-first, with bottom navigation for core learner areas and persistent exam controls.
6. Never use fake progress or activity in production.

### Core screens to redesign

- Marketing home with proof, product walkthrough, module preview, pricing summary and FAQ.
- Short onboarding with target level/date and personalized first recommendation.
- “Today” dashboard with resume card, weekly plan, real readiness and recent work.
- Searchable practice library with useful progress/level/status cards.
- Distraction-free exam workspace with timer, question map and autosave state.
- Results page with score hierarchy, explanations and one clear next action.
- Writing editor with prompt checklist and side-by-side feedback/revision on desktop.
- Payment status timeline and proof-upload experience.
- Admin shell with consistent tables, filters, bulk-safe actions and form-based content editors.

### Accessibility and localization

- Target WCAG 2.2 AA: keyboard access, visible focus, semantic landmarks, labels, error summaries, contrast and reduced-motion support.
- French is the default support UI; German is used for authentic exam material. Centralize all UI strings from the start so Arabic and additional languages can be added without component rewrites.
- Preserve left-to-right layout for German/French. If Arabic support is introduced, direction must switch by locale, not be hard-coded per page.

## 9. Data and architecture changes

### Suggested domain additions

- `content_items`, `content_versions`, `media_assets`, skill-specific sections/questions/options and publication metadata.
- `attempts` and `attempt_answers` generalized across reading/listening/simulation, with status, timers and autosave timestamps.
- `writing_prompts`, `writing_drafts`, `writing_submissions`, `ai_evaluations` and rubric/prompt versions.
- `learner_progress`, `skill_metrics`, `study_goals`, `activity_events` and `mistake_items`.
- `payment_proofs`, `subscription_events`, `admin_notes`, `roles`, `permissions` and `audit_logs`.
- Verification/reset tokens with hashed token values and expiry.

### Engineering requirements

- Keep secrets and AI/payment operations server-side.
- Use object storage such as Cloudflare R2 for audio and payment proofs; use signed/private access for sensitive proofs.
- Add idempotency/transactions or equivalent compensating logic for payment approval, attempt submission and usage charging.
- Add cursor pagination for admin/content/history endpoints.
- Standardize API error codes and request/response schemas; consider generating frontend types from a shared contract.
- Define retention and deletion behavior for account, payment proof, session, AI submission and analytics data.
- Add database migration, backup and restore procedures for production.

## 10. Non-functional requirements

### Performance

- Public LCP ≤ 2.5 seconds at the 75th percentile on mobile; CLS ≤ 0.1; INP ≤ 200 ms.
- Core API reads p95 ≤ 500 ms excluding AI; autosave acknowledgement p95 ≤ 800 ms.
- Lazy-load non-critical routes and media; audio should begin reliably on typical Moroccan mobile connections.

### Reliability

- Target 99.9% monthly availability for authenticated practice excluding planned maintenance.
- No answer loss after a successful autosave acknowledgement.
- AI failure must preserve the writing draft and not incorrectly consume credit; retries must not double-charge.

### Security and privacy

- Rate-limit login, registration, reset, AI and payment endpoints.
- Review CSRF protection for cookie-authenticated mutations, CORS allow-list behavior, cookie flags and session rotation.
- Validate uploads by type/size, malware-scan where available, and never expose payment proofs publicly.
- Apply least privilege to admin roles and record sensitive actions.
- Publish privacy/terms/refund policies appropriate to the operating jurisdiction and payment process.

### Quality and observability

- Unit tests for scoring, subscription entitlement, quotas and validation.
- API integration tests for authentication, access control, payment idempotency and attempt submission.
- End-to-end tests for register → trial → practice, writing correction, payment approval and simulation.
- CI must run lint, typecheck, tests, migration checks and production builds.
- Add structured logs, request IDs, error monitoring, uptime checks and privacy-conscious product analytics.

## 11. Metrics

### North-star metric

**Weekly learners completing at least two meaningful practice sessions**, where a meaningful session is a submitted skill exercise or simulation segment with a stored result.

### Supporting metrics

- Registration → first completed exercise conversion.
- Week-1 and week-4 learner retention.
- Exercises completed per weekly active learner.
- Simulation start/completion rate.
- Score improvement over comparable attempts.
- Writing draft → AI feedback → revision rate.
- Trial → paid conversion and renewal rate.
- Median manual payment approval time and support contacts per payment.
- Content completion/abandonment and problematic-question rate.
- AI success rate, latency, cost per evaluated submission and schema-error rate.

All events need a written name, trigger, properties, owner and privacy classification before implementation.

## 12. Delivery roadmap

### Phase 0 — Foundation and design system (2–3 weeks)

- Validate target learner interviews, content licensing and scoring rules.
- Establish design tokens, component library, responsive app shell, localization framework and screen prototypes.
- Add CI, automated test baseline, logging/error monitoring and analytics taxonomy.
- Define shared content/attempt data model and migration plan.

**Exit:** approved prototypes for public, learner, exam, result, payment and admin journeys; CI protects main branch.

### Phase 1 — Trustworthy learning core (4–6 weeks)

- Replace static dashboard values with stored activity/progress.
- Complete reading timer, autosave, history and review.
- Move listening and writing content into the CMS/data model.
- Build persistent listening attempts and writing drafts/history/revisions.
- Replace JSON-only administration with form-based content editors and media storage.

**Exit:** a learner can complete and revisit a reliable end-to-end attempt in every existing skill; admins publish all content without deployment.

### Phase 2 — Professional commercial release (3–4 weeks)

- Deliver redesigned public/onboarding/profile/settings flows.
- Add verification/recovery/session controls.
- Add payment proof/status timeline, idempotent reconciliation, subscription admin and audit log.
- Implement user administration, RBAC, operational analytics, privacy and legal flows.

**Exit:** the platform can safely onboard, monetize and support real learners with measurable operations.

### Phase 3 — Exam readiness (3–5 weeks)

- Build complete timed simulations and readiness calculation.
- Add mistake notebook, weak-area recommendations and study plan.
- Improve result trends and content analytics.

**Exit achieved (engineering, 2026-08-12):** simulations persist and score correctly, feed readiness through idempotent progress events, and generate a useful next action. Production pedagogical sign-off on the readiness formula and authentic TELC blueprints remains an operator responsibility.

### Phase 4 — Growth and differentiation

- Add speaking practice with recording, consent/retention controls and a reviewed scoring approach.
- Evaluate an online Moroccan payment provider, reminders, referrals and carefully controlled AI personalization.
- Run experiments only after event quality and baseline conversion are stable.

## 13. Professional launch acceptance criteria

- No learner-facing metric, activity or filter is fake or non-functional.
- Reading, listening and writing content is database/CMS managed.
- Attempts survive refresh and can be resumed without answer loss.
- Full simulation works for at least one validated B1 blueprint; B2 is only advertised when its content is ready.
- AI feedback is stored, versioned, quota-safe and recoverable after errors.
- Payment approval is idempotent and auditable; proof is private.
- Password recovery, verification, profile editing and account controls work.
- Admin permissions are enforced in both UI and API.
- Critical automated tests pass in CI, production migrations are rehearsed, and restore procedure is documented.
- Core learner and payment flows meet WCAG 2.2 AA checks and responsive QA at 360, 768 and 1280 px.
- Product metrics and operational alerts are visible to owners before launch.

## 14. Open product decisions

1. Confirm the exact TELC B1/B2 blueprints and scoring rules the product may legally reproduce.
2. Decide whether B1 and B2 launch together or B1 becomes the quality-first initial release.
3. Choose UI languages for launch: recommended French first, German for exam material, Arabic next.
4. Define the readiness-score formula and minimum evidence required before displaying it.
5. Choose payment-proof retention and the online payment provider shortlist for Morocco.
6. Decide whether AI feedback is pedagogical guidance only or marketed as an exam-score estimate; wording and disclaimers must match.
7. Set content production ownership, review workflow and monthly publishing target.
