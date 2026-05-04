# Command: update

Use when the user changes task state, scope, category, priority, repository references, dependencies, implementation notes, review outcome, or acceptance criteria.

## Inputs

- Task id or path.
- Requested change.
- Optional state:
  - `todo`
  - `in-progress`
  - `in-review`
  - `done`

## Procedure

1. Locate the task by filename stem, wikilink, or path.
2. Read the task page, `project/board.md`, relevant `project/info/` pages, related raw sources, checks, graph artifacts, and relevant configured repository code/docs.
3. Infer the requested change from evidence. Update status, scope, category, priority, repositories, areas, components, dependencies, blockers, acceptance criteria, implementation notes, and evidence when the available context supports it.
4. Update only fields or sections supported by the request or evidence.
5. Update frontmatter `updated` date.
6. If status changes or should be inferred from new evidence, move the Kanban card to the matching lane:
   - `todo` -> `## To Do`
   - `in-progress` -> `## In Progress`
   - `in-review` -> `## In Review`
   - `done` -> `## Done`
7. Add or update `## Evidence` with the exact code paths, docs, raw files, info pages, commits, PRs, issues, user statements, or check results that justify the changes.
8. Preserve the Kanban plugin frontmatter and hidden `%% kanban:settings ... %%` block.
9. Split the task if evidence shows scope is too broad.
10. Merge duplicates only when the request clearly authorizes consolidation or the duplicate is unambiguous from evidence.
11. Add follow-up tasks when review/check/code inspection exposes missing work.
12. Update graph artifacts when dependencies, components, repositories, areas, sources, or states change.
13. Run the `check` command procedure.
14. Append a concise entry to `project/log.md`.

## Output

- Updated task page.
- Updated board.
- Updated graph artifacts when topology changes.
- Check report.
 - Optional code, docs, review, issue, or implementation evidence.
