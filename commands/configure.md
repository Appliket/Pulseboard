# Command: configure

Use when the user provides project taxonomy, repository references, examples, or asks to bootstrap conventions from GitHub.

## Inputs

- User-provided categories, priorities, areas, repositories, and examples.
- Optional GitHub repository slugs or local repository paths.
- Optional issue/label summaries supplied by the user or gathered through an approved GitHub tool.
- Existing project docs, code layout, and maintained info pages that reveal project conventions.

## Procedure

1. Read `project/config.md`, `project/info/`, and any configured repository docs/code that the user authorizes or references.
2. Preserve all user-confirmed definitions unless the user explicitly changes them.
3. Add or update repositories with `name`, `github`, `path`, and `areas`.
4. Add or update areas, categories, and priorities.
5. Each category must include:
   - `key`
   - `description`
   - at least one example
6. Each priority must include:
   - `key`
   - `description`
   - at least one example
7. If GitHub information is used, write it only under `## GitHub-Derived Suggestions`.
8. Mark GitHub-derived suggestions as tentative unless the user explicitly confirms them.
9. If code/docs/info reveal likely areas, components, repository mappings, category examples, or priority examples, record them as inferred suggestions unless user confirms them.
10. Never write secrets, tokens, cookies, private URLs with embedded credentials, or auth headers.
11. Update the frontmatter `updated` date.
12. Run the `check` command procedure.
13. Append a concise entry to `project/log.md`.

## GitHub Bootstrap Rules

- Do not import every issue as a task.
- Summarize observed labels, issue themes, area hints, and priority hints.
- Keep inferred conventions separate from confirmed configuration.
- Ask for confirmation before treating inferred conventions as policy.

## Output

- Updated `project/config.md`.
- Optional check report under `project/checks/`.
- Short user-facing summary of confirmed changes and tentative suggestions.
