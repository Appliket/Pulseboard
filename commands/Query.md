# Query

Use this command when the user asks the project wiki or knowledge base a question, such as what customers requested, which future features seem most valuable, why a decision was made, or what risks are visible from documents and calls.

## Scope

Query may read:

- Maintained context under `project/info/`
- Task records under `project/tasks/`
- Project history under `project/log.md`
- Configured docs paths in `project/config.md`
- Configured `knowledge_sources` in `project/config.md`, normally `raw/info/`, `raw/meetings/`, `raw/requests/`, and `raw/specs/`
- Append-only activity notes under `raw/activities/`

Query must not read ambient chat history, external services, or unconfigured docs unless the user explicitly supplies them for the current query.

## Procedure

1. Restate the question in operational terms.
2. Search maintained pages first, then raw source files. Prefer `rg` for text search and inspect the highest-signal files directly.
3. Separate evidence from inference:
   - Evidence: facts directly supported by source files.
   - Inference: product judgment drawn from evidence.
   - Unknowns: missing or conflicting information.
4. Cite supporting files for every important claim. Prefer wikilinks when referencing wiki pages and markdown file links when referencing local files.
5. When ranking feature opportunities, explain the criteria used, such as frequency, customer value, revenue impact, implementation cost, risk reduction, or strategic fit.
6. If the answer implies concrete work, propose local task records. Do not create GitHub issues unless the user asks for issue sync and the task is implementation-ready.
7. If source coverage is weak, say so directly and suggest what should be ingested next.

## Answer Format

Use a concise structure:

- `Answer`: direct response to the question.
- `Evidence`: source-backed observations with file references.
- `Inference`: clearly labeled product or planning judgment.
- `Gaps`: what the wiki does not yet know.
- `Next actions`: optional tasks, ingestion, or lint fixes.

## Rules

- Do not invent activity, customer intent, commitments, or priorities.
- Do not cite raw source material that was not actually inspected.
- Do not mutate existing `raw/` files.
- Do not let a confident synthesis hide weak evidence.
