# Check

Use this command to validate project coherence.

## Checks

Flag:

- Invalid task frontmatter or status.
- Kanban cards that point to missing task pages.
- Task pages missing from the board or appearing more than once.
- Board lane and task status mismatch.
- Undefined category, priority, area, or repository references.
- Low-confidence category or priority classification.
- Missing evidence or unsupported inference.
- Duplicate or overlapping tasks.
- Missing acceptance criteria.
- Missing affected areas or component links.
- Dependency cycles.
- Blocked tasks without blocker links.
- `done` tasks without validation evidence.
- Stale wikilinks or missing linked files.
- Architecture mismatch, such as frontend work implying backend/API work without backend/API links.
- `github_issue` placeholders or malformed issue URLs.
- Implementation-ready tasks that appear duplicated by another local task or synced issue.
- Planning/coherence tasks that were unnecessarily pushed toward GitHub issue sync.

## Output

Write a concise report under `project/checks/YYYY-MM-DD-check.md` and summarize the result to the user.
