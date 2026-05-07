# Sync GitHub Issues

Use this command when the user asks to sync Pulseboard task records to GitHub issues.

GitHub is optional. If no configured repository has a GitHub slug, stop after explaining that issue sync is not configured. Do not require GitHub for normal Pulseboard use.

## Scope

- Sync only implementation-ready task records from `project/tasks/`.
- Planning, coherence, research, audit, and maintained-info tasks usually stay local.
- Never create issues from raw notes or maintained plan pages directly.
- Never read or rely on ambient GitHub discussion history beyond listing existing open issues in configured repositories.

## Procedure

1. Read `project/config.md`, `project/tasks/`, `project/board.md`, and `project/log.md`.
2. List existing open GitHub issues for each configured repository with a `github` slug.
3. Build a duplicate map from existing issue titles, task ids, and any existing task `github_issue` frontmatter values.
4. Select candidate task records only when all are true:
   - The task is concrete enough for implementation.
   - The task is not archived and is not `done`.
   - The task frontmatter has no `github_issue`.
   - The task has acceptance criteria and enough implementation context.
   - The task is not mainly planning, coherence, audit, research, or information maintenance.
5. For each candidate, avoid duplicates by comparing against open issue titles, known task ids, existing `github_issue` URLs, and overlapping scope.
6. Create missing GitHub issues only for non-duplicate candidate tasks.
7. Write each created issue URL back into that task's frontmatter as `github_issue: "https://github.com/owner/repo/issues/N"`.
8. Add an append-only raw activity note under `raw/activities/YYYY-MM-DD-github-issue-sync.md`.
9. Update `project/log.md` with created issue count, skipped duplicate count, and any repositories that were not configured.
10. Run the `Check` procedure.
11. Run `npm run check`.
12. Run `npm run summary -- --dry-run`.
13. Run a tracked-file secret scan before finishing.

## Issue Content

Use the task record as the source of truth:

- Title: concise implementation outcome, usually matching the task title.
- Body: scope, acceptance criteria, implementation notes, evidence, dependencies, and Pulseboard task id.
- Labels: only if they are configured or already known to exist. Do not invent a required label taxonomy.

## Raw Activity Note

The raw activity note must summarize:

- Target date and repositories inspected.
- Open issues listed.
- Issues created with URLs.
- Candidate tasks skipped and why.
- Duplicate checks performed.

Do not edit previous raw activity notes if the sync needs correction. Add a new raw note.

## Secret Scan

Use a tracked-file scan, not a whole-working-tree scan:

```bash
git grep -n -I -E '(api[_-]?key|secret|token|password|webhook|BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY)' -- ':!package-lock.json'
```

Review matches for actual secrets before reporting completion.
