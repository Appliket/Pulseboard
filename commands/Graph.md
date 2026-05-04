# Graph

Graph maintenance is internal. Users should not need to run this as a separate command.

## Procedure

1. Read markdown pages under `project/`.
2. Extract wikilinks, task dependencies, components, repositories, areas, sources, and statuses.
3. Write deterministic `graph/graph.json`.
4. Preserve `graph/graph.html` as a lightweight local viewer.

## Determinism

- Sort nodes by `id`.
- Sort edges by `source`, `target`, then `type`.
- Treat generated graph artifacts as rebuildable views, not source of truth.
