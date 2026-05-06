# Injest

Use this command when the user provides background information, notes, documents, chats, specs, customer call transcripts, meeting material, or codebase context that should inform future task inference and product understanding.

The command name is intentionally `Injest`.

## Source Types

- Customer calls and transcripts: `raw/meetings/YYYY-MM-DD-<topic>.md`
- Customer requests, chats, and support snippets: `raw/requests/YYYY-MM-DD-<topic>.md`
- Durable external or internal reference material: `raw/info/YYYY-MM-DD-<topic>.md`
- Product specs and proposal drafts: `raw/specs/YYYY-MM-DD-<topic>.md`
- Work notes that may not appear in Git: `raw/activities/YYYY-MM-DD-<topic>.md`

## Procedure

1. Capture the provided source material in the most specific `raw/` directory. Use a dated filename and preserve the original wording as much as practical.
2. Do not mutate captured raw files after capture. If the user corrects something, add a new raw file that records the correction.
3. Create or update maintained context pages under `project/info/` with a synthesis of the durable facts, open questions, user needs, product signals, and decisions.
4. Link every maintained claim back to source material with wikilinks or plain markdown links. Do not let maintained pages become unsourced memory.
5. Link relevant tasks, areas, components, repositories, decisions, risks, customers, and product themes.
6. Create concrete follow-up tasks only when the source implies actionable work. Keep research, synthesis, and low-confidence product ideas local.
7. Update graph artifacts.
8. Update `project/log.md`.
9. Run `Lint` when the ingestion changes project knowledge. Run `Check` when it affects active tasks.

## Output Expectations

- Raw source files are append-only evidence.
- `project/info/` pages are maintained synthesis that can be rewritten as understanding improves.
- Any answerable future `Query` should be able to cite the raw files or maintained pages that support it.
- Do not invent customer needs, commitments, or priorities. Label uncertain inference explicitly.
