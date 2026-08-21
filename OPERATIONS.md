# TELC Prep production operations

## Release gate

1. Run `npm ci`, `npm test`, `npm run typecheck` and `npm run build`.
2. Rehearse every SQL migration against a new SQLite database, as CI does.
3. Confirm the production D1 database name and take note of its current Time Travel bookmark before applying migrations.
4. Apply migrations in numeric order, deploy the Worker, then deploy the frontend.
5. Verify `/api/health/live`, `/api/health`, registration, login, one free exercise, one premium gate and an admin read-only page.
6. Confirm that no demo seed was applied to production.

## Logs and request investigation

Workers observability is enabled in `backend/wrangler.toml`. API responses expose `X-Request-ID`, and JSON errors include the same reference. Search Workers Logs for that value to correlate the request with `http_request`, `unhandled_error` or `health_dependency_failed` events. Logs intentionally omit request bodies, email addresses, tokens and payment-proof contents.

Suggested alerts:

- readiness endpoint unavailable for two consecutive minutes;
- HTTP 5xx rate above 2% for five minutes;
- p95 API duration above 2 seconds for ten minutes;
- AI failures or average latency materially above the seven-day baseline;
- pending payment count or review time above the agreed support SLA;
- unusual authentication rate-limit volume.

Review Workers metrics and D1 query latency/rows-read weekly. Add an external uptime monitor and notification destination before launch; those require production account ownership and cannot be configured from this repository.

## D1 recovery

Check that the database uses the production storage backend:

```bash
npx wrangler d1 info telc-prep
npx wrangler d1 time-travel info telc-prep
```

Cloudflare D1 Time Travel provides point-in-time recovery. A restore overwrites production and cancels in-flight queries, so record the current bookmark, stop writes if possible, obtain incident-owner approval and validate the target timestamp before running:

```bash
npx wrangler d1 time-travel restore telc-prep --timestamp="RFC3339_TIMESTAMP"
```

After recovery, rerun health checks and core smoke tests, reconcile payments created around the restored interval and preserve the bookmark returned by Wrangler so the restore can be undone if necessary.

## Private payment proofs

The R2 bucket is private and proof downloads require payment-review permission. Define a production retention period before launch. Account deletion removes associated proof objects. R2 lifecycle rules and independent recovery policy must be configured in the Cloudflare account by the operator.

## Speaking recording retention

The Worker cron runs every day at 03:00 UTC and removes private speaking objects whose 30-day `delete_after` deadline has passed. Database metadata is deleted only after the corresponding R2 deletion succeeds; failures remain eligible for the next run and are reported in structured logs.

An administrator with `users.manage` can run the same bounded cleanup manually with `POST /api/admin/retention/speaking/run`. Check the returned `scanned`, `deleted` and `failed` counters. Configure an R2 lifecycle rule as a production defense in depth while keeping application cleanup as the source of metadata consistency.

## Incident minimum record

Record start/end time, impact, affected request IDs, detection source, mitigation, data correction, recovery bookmark where relevant, responsible owner and follow-up actions. Never paste passwords, reset tokens, session cookies, full payment proofs or learner writing into incident channels.
