# Injest

Use this command when the user provides background information, notes, specs, meeting material, or codebase context that should inform future task inference.

The command name is intentionally `Injest`.

## Procedure

1. Capture durable source material under `raw/info/`, `raw/specs/`, or `raw/meetings/`.
2. Do not mutate captured raw files after capture.
3. Create or update maintained context pages under `project/info/`.
4. Link relevant tasks, areas, components, repositories, decisions, and risks.
5. Update graph artifacts.
6. Update `project/log.md`.
7. Run the `Check` procedure when the new info affects active tasks.
