# Repurpose Audit

Use this command when the user asks to audit a product, repo, app, wiki, or docs set for repurposing, cleanup, migration, or renewed execution.

The output is a local-first Pulseboard plan: append-only source capture, one maintained plan page, and a small number of concrete tasks. GitHub issues are optional and only for implementation-ready tasks.

## Procedure

1. Read `project/config.md`, especially configured `repositories`, `docs`, `external_docs`, `activities`, areas, categories, and priorities.
2. Inspect configured local repositories and docs paths. Use repository evidence such as README files, package manifests, tests, build scripts, active source areas, recent commits, and existing issues only when configured.
3. Read configured external wiki or docs paths if present. External docs paths must be explicit in config or supplied by the user for this audit.
4. Add append-only source notes under `raw/activities/YYYY-MM-DD-<topic>-repurpose-audit.md`. Include what was inspected, key evidence paths, and uncertainty. Do not mutate existing `raw/` files.
5. Create or update one concise maintained plan page under `project/info/<topic>-plan.md`.
6. Identify:
   - What should be done now.
   - What is still needed before implementation.
   - What can be deleted, archived, or deferred.
   - Which assumptions need validation.
7. Create a small number of high-signal task records under `project/tasks/`. Prefer fewer, clearer tasks over a backlog dump.
8. Keep planning, coherence, research, and information-maintenance tasks local unless the user explicitly asks otherwise.
9. Mark implementation-ready tasks so they can later be synced by `Sync GitHub Issues`; leave `github_issue` absent until an issue is actually created.
10. Add each non-archived task exactly once to `project/board.md`.
11. Update graph artifacts.
12. Update `project/log.md`.
13. Run the `Check` procedure.
14. Run `npm run check`.
15. Run `npm run summary -- --dry-run`.
16. Run a tracked-file secret scan before finishing.

## Maintained Plan Page

Use this structure:

- Current Product Shape
- Useful Assets To Keep
- Gaps Before Repurpose
- Delete Or Defer
- Recommended Sequence
- Task Links
- Evidence
- Open Questions

The plan page is maintained and may be edited as understanding improves. Raw notes are source material and must stay append-only.

## Task Guidance

Create tasks only when they are actionable. A good audit usually produces:

- One local planning or coherence task if the next decision is unclear.
- One to three implementation-ready tasks when the work is concrete.
- One cleanup task only when deletion or archival is specific and justified.

Avoid creating GitHub issues during the audit unless the user asks for immediate issue sync. Use `Sync GitHub Issues` after the task records are coherent.

## Secret Scan

Use a tracked-file scan, not a whole-working-tree scan:

```bash
git grep -n -I -E '(api[_-]?key|secret|token|password|webhook|BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY)' -- ':!package-lock.json'
```

Review matches for actual secrets before reporting completion.
