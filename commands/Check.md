# Command: Check

Use after every Configure, Add, Update, Injest, split, merge, or graph-affecting change.

## Inputs

- `project/config.md`
- `project/board.md`
- `project/tasks/*.md`
- Related pages in `project/features/`, `project/components/`, `project/decisions/`, and `project/risks/`
- Maintained context in `project/info/`
- Relevant configured repository code and docs when task inference depends on them
- `graph/graph.json`

## Procedure

1. Validate `project/config.md`.
2. Validate every task frontmatter block.
3. Validate every task status is one of:
   - `todo`
   - `in-progress`
   - `in-review`
   - `done`
4. Validate every task has:
   - category from config
   - priority from config
   - affected area
   - component link
   - source link
   - acceptance criteria
   - evidence section
5. Validate every repository reference matches `project/config.md`.
6. Validate `project/board.md` frontmatter includes `kanban-plugin: board`.
7. Validate board lanes are exactly:
   - `## To Do`
   - `## In Progress`
   - `## In Review`
   - `## Done`
8. Validate each board card is a checkbox wikilink.
9. Validate each board card links to an existing task page.
10. Validate every non-archived task appears exactly once on the board.
11. Validate lane status agrees with task frontmatter.
12. Validate inferred status against evidence:
   - `todo` should not have strong implementation/review/completion evidence.
   - `in-progress` should have start evidence or explicit user statement.
   - `in-review` should have review, PR, handoff, or testing evidence.
   - `done` must have completion and validation evidence.
13. Validate inferred category, priority, areas, repositories, dependencies, and components against code/docs/info evidence when available.
14. Flag low-confidence category, priority, area, repository, dependency, or status classification.
15. Detect duplicate or overlapping tasks by title, request, source, evidence, and acceptance criteria.
16. Detect tasks without acceptance criteria.
17. Detect tasks without evidence.
18. Detect missing project-area/component links.
19. Detect dependency cycles through `depends_on`.
20. Detect blocked tasks without blocker links.
21. Detect `done` tasks without validation evidence.
22. Detect stale wikilinks or missing linked files.
23. Detect architecture mismatch, such as frontend work implying backend/API work but lacking backend/API links.
24. If graph artifacts are stale, update them automatically by following `commands/Graph.md`.
25. Validate graph artifacts reflect current tasks, states, dependencies, components, repositories, areas, sources, and info pages.
26. Write a concise report under `project/checks/YYYY-MM-DD-check.md`.
27. Add the latest check summary to affected tasks under `## Check Result`.

## Report Format

```markdown
# Project Check

- Date: YYYY-MM-DD
- Result: clean | N finding(s)

## Findings

- finding text

## Follow-Up Tasks

- Optional suggested task links or titles.
```

## Output

- Check report.
- Concise user-facing result: `clean` or a prioritized findings list.
