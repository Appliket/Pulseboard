# Lint

Use this command to validate the wiki and knowledge base hygiene before relying on it for planning, product inference, or customer understanding.

`Lint` is broader than task-board coherence. `Check` validates project/task consistency. `Lint` validates whether the knowledge base can be trusted as a source-backed wiki.

## Procedure

1. Read `commands/Injest.md`, `commands/Query.md`, and `commands/Check.md`.
2. Inspect maintained pages under `project/info/`, `project/tasks/`, `project/log.md`, and the configured docs paths in `project/config.md`.
3. Inspect source-material directories from `activities` and `knowledge_sources` in `project/config.md`.
4. Flag stale wikilinks, missing linked files, duplicate pages, orphaned maintained pages, and maintained claims that lack a source link.
5. Flag raw files that look edited into summaries instead of preserved source material.
6. Flag product recommendations, priorities, or customer claims that are not tied to evidence.
7. Flag query-hostile organization, such as important themes spread across raw notes with no maintained `project/info/` synthesis page.
8. Run the `Check` procedure when task or board consistency may also be affected.

## Output

Write a concise report under `project/checks/YYYY-MM-DD-lint.md`.

The report should include:

- `Status`: pass, warnings, or fail.
- `Evidence gaps`: claims or pages that need source links.
- `Broken links`: stale or missing wikilinks.
- `Raw hygiene`: any append-only source-material risks.
- `Query readiness`: what questions are well-supported and what questions need more ingestion.
- `Recommended fixes`: small, concrete edits or tasks.

## Rules

- Do not mutate existing `raw/` files while linting.
- Do not treat generated `graph/` artifacts as source of truth.
- Do not create GitHub issues from lint findings directly. Create task records first if follow-up work is concrete.
