# Add

Use this command when the user gives a natural-language project request.

## Procedure

1. Capture the original request in `raw/requests/` unless it already exists.
2. Read `project/config.md`, existing task pages, `project/info/`, and configured repository evidence.
3. Create a task only when the work is concrete enough to track.
4. Infer status, category, priority, area, components, repositories, dependencies, acceptance criteria, and open questions from evidence.
5. Default status to `todo` unless evidence clearly indicates another state.
6. Create a deterministic lowercase kebab-case task file under `project/tasks/`.
7. Leave `github_issue` absent unless a GitHub issue already exists for this exact task.
8. Keep planning, coherence, research, audit, and information-maintenance tasks local unless the user explicitly asks for issue sync.
9. Add one checkbox wikilink card to the matching lane in `project/board.md`.
10. Update graph artifacts.
11. Update `project/log.md`.
12. Run the `Check` procedure.

## Task Sections

Each task should include:

- Request
- Scope
- Affected Areas
- Category And Priority
- Acceptance Criteria
- Implementation Notes
- Evidence
- Dependencies
- Open Questions
- Check Result

## GitHub Issue Field

Use `github_issue` only for a real issue URL. Do not set placeholders such as `pending`, `todo`, or `none`.
