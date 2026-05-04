# Technical Project Wiki

Technical Project Wiki is a markdown-first, graph-backed project-management system for local agile/Kanban execution.

The MVP follows the Karpathy/LLM Wiki style: no Python, no package install, no database, no vector store, no SaaS dependency, and no background service. Durable request material lives in `raw/`; maintained project pages live in `project/`; generated topology artifacts live in `graph/`.

## Quick Start

Open this folder with an LLM coding agent and ask it to follow [AGENTS.md](AGENTS.md).

Example agent commands:

```text
Configure this wiki for my app: categories feature, bug, chore; priorities p0-p3; repo owner/example-web at ../example-web
Add "Add Google login to onboarding"
Update [[add-google-login-onboarding]] to in-progress
Check the project wiki
Injest these architecture notes into project info: ...
```

Open `project/board.md` in Obsidian with the Kanban plugin enabled to see the human status board.

## Commands

- `Configure`: follow [commands/Configure.md](commands/Configure.md).
- `Add`: follow [commands/Add.md](commands/Add.md).
- `Check`: follow [commands/Check.md](commands/Check.md).
- `Update`: follow [commands/Update.md](commands/Update.md).
- `Injest`: follow [commands/Injest.md](commands/Injest.md).

Graph artifacts are maintained automatically by the agent whenever project topology changes; there is no separate user-facing graph command.

Ask for a dry run or preview when you want planned file changes without edits.

## Inference Model

Task fields should be inferred by the agent from evidence: current request, existing task history, configured repository code/docs, maintained pages in `project/info/`, raw source material, decisions, risks, checks, graph artifacts, and tentative GitHub suggestions.

Use `raw/info/` for immutable captured reference material and `project/info/` for maintained summaries and inference hints. Task pages should cite the evidence used to infer status, category, priority, areas, repositories, dependencies, acceptance criteria, and validation state.

## GitHub Bootstrap

GitHub bootstrap never imports every issue as a task. It only proposes tentative categories, priorities, areas, and repository mappings.

Use an approved GitHub connector, GitHub CLI, or pasted issue/label summaries. Never store tokens or secrets. Review the `GitHub-Derived Suggestions` section in `project/config.md` before treating inferred conventions as policy.

## No Runtime Contract

This repo should remain inspectable as plain files. Do not add framework-heavy tooling for the MVP. If automation is added later, it must be optional and must not replace the markdown command protocol.
