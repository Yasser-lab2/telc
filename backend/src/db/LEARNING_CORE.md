# Learning core migration strategy

Migration `0003_learning_core.sql` adds a shared model without changing or deleting the existing reading tables.

## Ownership

- `content_items` is the common catalog record for reading, listening, writing, speaking and simulations.
- `content_sections`, `content_questions` and `content_options` store ordered exercise structure.
- `media_assets` stores metadata for private or public objects; the binary belongs in object storage, not D1.
- `content_item_media` connects media to content with a semantic role such as `primary_audio` or `illustration`.
- `attempts` and `attempt_answers` are the durable autosave and scoring records shared by skills.
- `writing_drafts` stores resumable writing text while `ai_submissions.attempt_id` links a completed correction to its attempt.
- `learner_progress` is a rebuildable aggregate for fast dashboard reads.
- `activity_events` powers recent activity and product analytics without using fabricated frontend data.

JSON columns are reserved for type-specific settings and metadata. Fields used for access control, filtering, ordering, scoring, lifecycle or relationships remain first-class columns.

## Migration sequence

1. Apply `0003_learning_core.sql`; current routes continue using the legacy tables.
2. Add content service/repository functions and admin APIs against the shared tables. **Repository and read APIs added.**
3. Copy published reading exams into the shared model and verify parity before switching reads.
4. Import hard-coded listening and writing content into `content_items`. **Initial import completed in migration 0004.**
5. Switch one skill at a time to shared attempts and answers.
6. Populate progress/activity only from successfully completed attempts.
7. Remove legacy tables in a later migration only after production parity and rollback checks.

Listening and writing now use shared attempts. Writing draft persistence and submission history were added in migration `0006_writing_drafts.sql`.
Reading keeps its validated JSON-managed content and answer tables, while migration `0007_reading_attempt_bridge.sql` links each reading session to the shared attempt/progress lifecycle.

## Invariants

- Published content is never edited in place once learners have attempts; create a new content version in the later versioning migration.
- Attempt submission must be idempotent and update progress/activity once.
- `state_version` supports optimistic concurrency during autosave.
- Correct answers are returned only by authorized admin endpoints or after learner submission.
- Deleting users cascades learning history; deleting content referenced by attempts is restricted.
