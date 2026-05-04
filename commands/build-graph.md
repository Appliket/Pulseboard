# Command: build-graph

Use when project topology changes or before sharing the graph view.

## Inputs

- `project/**/*.md`
- Task frontmatter fields:
  - `status`
  - `area`
  - `components`
  - `repositories`
  - `depends_on`
  - `blocks`
  - `sources`
- Markdown wikilinks.
- Maintained info pages under `project/info/`.

## Procedure

1. Read all maintained markdown pages under `project/`.
2. Create one node for each page.
3. Create source nodes for each raw source path referenced by task frontmatter.
4. Create area nodes as `area:<name>`.
5. Create component nodes as `component:<name>`.
6. Create repository nodes as `repo:<name>`.
7. Create info nodes for `type: info` pages and connect their sources, repositories, areas, components, and related wikilinks.
8. Create edges:
   - `wikilink`
   - `depends_on`
   - `blocks`
   - `source`
   - `area`
   - `component`
   - `repository`
   - `status`
   - `evidence`
9. Sort nodes by `id`.
10. Sort edges by `source`, `target`, then `type`.
11. Write deterministic JSON to `graph/graph.json`.
12. Keep `graph/graph.html` lightweight and dependency-free.

## Output Shape

```json
{
  "nodes": [
    {"id": "task-id", "kind": "task", "path": "project/tasks/task-id.md", "status": "todo"}
  ],
  "edges": [
    {"source": "task-id", "target": "area:frontend", "type": "area"}
  ]
}
```
