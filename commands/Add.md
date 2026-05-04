# Add

Use this command when the user gives a natural-language project request.

## Procedure

1. Capture the original request in `raw/requests/` unless it already exists.
2. Read `project/config.md`, existing task pages, `project/info/`, and configured repository evidence.
3. Create a task only when the work is concrete enough to track.
4. Infer status, category, priority, area, components, repositories, dependencies, acceptance criteria, and open questions from evidence.
5. Default status to `todo` unless evidence clearly indicates another state.
6. Create a deterministic lowercase kebab-case task file under `project/tasks/`.
7. Add one checkbox wikilink card to the matching lane in `project/board.md`.
8. Update graph artifacts.
9. Update `project/log.md`.
10. Run the `Check` procedure.

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
