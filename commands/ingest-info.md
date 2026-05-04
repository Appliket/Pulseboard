# Command: ingest-info

Use when the user provides background documents, architecture notes, repository summaries, meeting notes, product docs, code observations, links, screenshots, or any material that should help infer task metadata later.

## Inputs

- User-provided text or files.
- Existing docs in configured repositories.
- Code observations from configured repository inspection.
- GitHub issue/PR summaries, when access is approved.
- Existing raw material that needs a maintained summary.

## Storage Model

- Store exact durable source material under `raw/info/` when it is new source material.
- Do not mutate raw info files after capture.
- Store maintained summaries, indexes, conventions, architecture notes, domain knowledge, and inference hints under `project/info/`.
- Maintained info pages may be updated when better evidence appears.

## Procedure

1. Decide whether the input is raw source material, maintained context, or both.
2. If raw, capture exact source text in `raw/info/YYYY-MM-DD-kebab-summary.md`.
3. If the source is a file that already exists in a configured repository, do not duplicate the full file into `raw/info/`; cite its path instead.
4. Update or create a focused page in `project/info/`.
5. Record:
   - source paths or links
   - related repositories
   - related areas
   - related components
   - task inference hints
   - category/priority conventions
   - status inference hints
   - open questions
6. Link related tasks, features, components, decisions, risks, or checks with wikilinks.
7. Update `project/info/index.md`.
8. Update graph artifacts if topology changes.
9. Run the `check` command procedure if the new info changes task interpretation.
10. Append a concise entry to `project/log.md`.

## Info Page Template

```markdown
---
type: info
title: Example Context
updated: YYYY-MM-DD
repositories:
  - example-web
area:
  - frontend
components:
  - auth
sources:
  - raw/info/YYYY-MM-DD-example-context.md
---

# Example Context

## Summary

Maintained context that helps infer project work.

## Evidence

- Source file, raw info file, repository path, issue, PR, or user statement.

## Inference Hints

- Status hints.
- Category and priority hints.
- Area, component, dependency, and repository hints.

## Related Nodes

- [[task-or-decision]]

## Open Questions

- Unknowns that should not be guessed.
```

## Output

- Optional new raw info capture.
- New or updated `project/info/` page.
- Updated graph artifacts when topology changes.
- Optional check report.

