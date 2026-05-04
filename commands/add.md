# Command: add

Use when the user describes a new client, product, engineering, or project-management request.

## Inputs

- Natural-language request text.
- Optional source context, repository hints, area hints, priority hints, or category hints.
- Existing code, docs, configured repositories, `project/info/`, and raw source material that can clarify the task.

## Procedure

1. Read `project/config.md`, `project/board.md`, existing task pages in `project/tasks/`, maintained context in `project/info/`, relevant raw sources, and relevant configured repository code/docs.
2. Capture the exact request in `raw/requests/YYYY-MM-DD-kebab-summary.md`.
3. Do not mutate an existing raw request file.
4. Decide whether the request updates an existing task or creates a new task.
5. Create a task only if the work is concrete enough to track.
6. Use deterministic lowercase kebab-case for task filenames.
7. Infer task status from evidence. Default to `todo` only when no evidence shows work has started.
8. Infer category and priority from confirmed config, examples, request wording, existing task patterns, code impact, and docs.
9. If classification is uncertain, set `confidence: low`, document the weak evidence, and add an open question.
10. Infer repository references from configured repository names, paths, GitHub slugs, code paths, docs, and request wording. Add only configured repository names.
11. Infer affected areas and components from code paths, docs, existing architecture notes, `project/info/`, and source wording.
12. Infer dependencies and blockers from existing tasks, decisions, risks, code coupling, API contracts, and docs.
13. Add objective acceptance criteria inferred from the request, code behavior, docs, and existing test/validation conventions.
14. Add an `## Evidence` section citing raw files, info pages, code paths, docs, issues, checks, or user statements used for inference.
15. Add open questions only for requirements or evidence that remain genuinely unresolved.
16. Insert exactly one Kanban card in the lane matching inferred status:
    - `todo` -> `## To Do`
    - `in-progress` -> `## In Progress`
    - `in-review` -> `## In Review`
    - `done` -> `## Done`
17. Update `project/index.md` if a new important info, feature, component, decision, or risk page is created.
18. Update `graph/graph.json` and `graph/graph.html` if topology changes.
19. Run the `check` command procedure.
20. Append a concise entry to `project/log.md`.

## Task Template

```markdown
---
type: task
title: Example Task
status: todo
created: YYYY-MM-DD
updated: YYYY-MM-DD
project: project-name
area:
  - frontend
components:
  - example-component
category: feature
priority: p1
repositories:
  - example-web
depends_on: []
blocks: []
sources:
  - raw/requests/YYYY-MM-DD-example.md
confidence: medium
---

# Example Task

## Request

Source-backed description.

## Scope

Included and excluded work.

## Affected Areas

Frontend/backend/mobile/API/database/design/infrastructure/docs/tests as relevant.

## Category And Priority

Configured category and priority, with reasoning and confidence.

## Acceptance Criteria

- Objective checks.

## Implementation Notes

Architecture constraints and discovered technical details.

## Evidence

- Source, code, docs, info pages, issues, checks, or user statements used for inference.

## Dependencies

Linked prerequisite tasks, decisions, or risks.

## Open Questions

Unresolved requirements.

## Check Result

Latest coherence check summary.
```

## Output

- New or updated raw request.
- New or updated task page.
- Updated `project/board.md`.
- Updated graph artifacts when topology changes.
- Check report.
