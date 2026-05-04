# Technical Project Wiki Agent Rules

These rules govern all AI-assisted work in this repository. Follow them even when a user asks casually.

## Purpose

This repository is a local-first technical project-management wiki inspired by the Karpathy/LLM Wiki pattern. Work is represented as small markdown nodes, connected through wikilinks and explicit metadata. There is no required runtime, database, vector store, package manager, background service, or Python CLI. The agent reads the command specs in `commands/` and edits markdown/json artifacts directly.

The Obsidian Kanban board is the canonical human status view. Task pages are the canonical structured records. Graph artifacts are rebuildable topology views.

## Directory Rules

- `raw/` stores durable source material exactly as captured.
- `raw/requests/`, `raw/meetings/`, `raw/specs/`, `raw/info/`, and `raw/assets/` are append-only after capture.
- Never mutate, rewrite, summarize over, or delete a captured raw file. Create a new raw file for corrections or follow-ups.
- `project/` stores maintained project-management pages.
- `project/config.md` stores confirmed configuration and tentative bootstrap suggestions.
- `project/board.md` stores the Obsidian Kanban board.
- `project/info/` stores maintained background/context pages synthesized from raw material, code inspection, docs, and user-confirmed knowledge.
- `project/tasks/` stores task pages.
- `project/checks/` stores generated check reports.
- `graph/` stores generated graph artifacts. These may be rebuilt.
- `commands/` stores agent command procedures. Treat these as executable instructions.

## Configuration Rules

- User-provided categories, priorities, areas, examples, and repositories are authoritative.
- GitHub-derived categories, priorities, areas, labels, and repository mappings are tentative until confirmed by the user.
- Tentative GitHub suggestions must be recorded separately from confirmed configuration.
- Never store GitHub tokens, credentials, cookies, private keys, or secrets in `raw/`, `project/`, `graph/`, tests, or examples.
- Repository references in tasks must match configured repository names in `project/config.md`.
- Each category must have `key`, `description`, and at least one example.
- Each priority must have `key`, `description`, and at least one example.

## Task Rules

Each task page must use this frontmatter shape:

```yaml
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
```

Allowed task states are exactly:

- `todo`
- `in-progress`
- `in-review`
- `done`

Tasks must include request, scope, affected areas, category/priority reasoning, acceptance criteria, implementation notes, evidence, dependencies, open questions, and latest check result sections.

## Evidence And Inference Rules

- The agent must infer task metadata from evidence when possible. Do not ask the user to manually provide status, category, priority, area, repositories, components, dependencies, or acceptance criteria if these can be inferred from the wiki, configured repositories, code, docs, raw sources, or maintained info pages.
- Use evidence in this order:
  1. Explicit user instruction in the current request.
  2. Existing task frontmatter and task history.
  3. Configured repository code and docs.
  4. `project/info/` maintained context pages.
  5. `raw/` source material.
  6. Existing project pages, decisions, risks, checks, and graph artifacts.
  7. GitHub-derived suggestions, only as tentative evidence.
- Record important evidence in task pages under `## Evidence`.
- If evidence conflicts, prefer explicit user instruction and user-confirmed config; record the conflict in `## Open Questions`.
- If inference is weak, use `confidence: low`, explain why, and add an open question.
- Status may be inferred:
  - `todo`: request exists but no implementation evidence shows work started.
  - `in-progress`: code branches, partial implementation notes, recent commits, active review comments, or user statements show work started.
  - `in-review`: pull request, review request, testing handoff, or explicit review state exists.
  - `done`: implementation is merged/completed and validation evidence exists.
- Category, priority, area, components, repositories, dependencies, blockers, and acceptance criteria should be inferred from source request wording, code paths, docs, config examples, existing task patterns, and repository structure.
- Never invent facts. Separate inferred facts from confirmed facts.

## Board Rules

- `project/board.md` must remain compatible with the Obsidian Kanban plugin.
- Board frontmatter must include `kanban-plugin: board`.
- Board lanes must be exactly:
  - `## To Do`
  - `## In Progress`
  - `## In Review`
  - `## Done`
- Cards must be checkbox list items containing task wikilinks, for example `- [ ] [[add-google-login]]`.
- The board status mapping is:
  - `To Do` -> `todo`
  - `In Progress` -> `in-progress`
  - `In Review` -> `in-review`
  - `Done` -> `done`
- Each non-archived task must appear exactly once on the board.
- When task status changes, move the board card to the matching lane.
- Preserve the hidden `%% kanban:settings ... %%` block if it already exists.

## Command Rules

- There is no CLI to run. A user invokes commands by asking the agent, for example `Add "request text"` or `Update [[task-id]] to in-progress`.
- For `Configure`, follow `commands/Configure.md`.
- For `Add`, follow `commands/Add.md`.
- For `Check`, follow `commands/Check.md`.
- For `Update`, follow `commands/Update.md`.
- For `Injest`, follow `commands/Injest.md`.
- Graph maintenance is automatic after any command that changes project topology. Follow `commands/Graph.md` internally; users should not need to run a separate graph command.
- When the user asks for a dry run or preview, describe planned file changes and do not edit files.
- Run the `Check` procedure after configuration and task changes.
- Keep command output concise and actionable.

## Graph Rules

- `graph/graph.json` is generated automatically from markdown links, task dependencies, components, repositories, areas, sources, and status.
- `graph/graph.html` is a lightweight local viewer.
- Generated graph artifacts may be rebuilt at any time.
- Do not treat generated graph files as source of truth.
- Graph JSON must be deterministic: sort nodes by `id` and edges by `source`, `target`, then `type`.
- Any command that creates, updates, deletes, moves, links, relinks, or changes status of a project node must update graph artifacts in the same change.

## Check Rules

Checks must flag:

- Invalid task frontmatter or state.
- Kanban cards that point to missing task pages.
- Task pages missing from the board or appearing more than once.
- Board lane and task status mismatch.
- Undefined category, priority, or repository references.
- Low-confidence category or priority classification.
- Missing task evidence or unsupported inference.
- Status that does not match available evidence.
- Duplicate or overlapping tasks.
- Missing acceptance criteria.
- Missing affected areas or component links.
- Dependency cycles.
- Blocked tasks without blocker links.
- `done` tasks without validation evidence.
- Stale wikilinks or missing linked files.
- Architecture mismatch, such as frontend work implying backend/API work without backend/API area links.
