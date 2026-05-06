const assert = require("node:assert/strict");
const {
  boardPulseboard,
  callTool,
  checkPulseboard,
  fetchPulseboard,
  lintPulseboard,
  listTasks,
  queryPulseboard,
  searchPulseboard,
  tools,
} = require("../tools/pulseboard-mcp");

const options = { mode: "local", root: process.cwd() };

assert.ok(tools.find((tool) => tool.name === "search"));
assert.ok(tools.find((tool) => tool.name === "fetch"));
assert.ok(tools.find((tool) => tool.name === "query"));
assert.ok(tools.find((tool) => tool.name === "lint"));
assert.ok(tools.find((tool) => tool.name === "list_tasks"));
assert.ok(tools.find((tool) => tool.name === "get_board"));
assert.ok(tools.find((tool) => tool.name === "check"));
assert.ok(tools.find((tool) => tool.name === "create_ingest_pr"));
assert.ok(tools.find((tool) => tool.name === "create_task_pr"));
assert.ok(tools.find((tool) => tool.name === "update_task_pr"));

const search = searchPulseboard("knowledge base query evidence", options);
assert.ok(search.results.length > 0);
assert.ok(search.results.some((result) => result.id === "project/info/knowledge-base.md" || result.id === "commands/Query.md"));

const fetched = fetchPulseboard("commands/Query.md", options);
assert.equal(fetched.id, "commands/Query.md");
assert.match(fetched.text, /Separate evidence from inference/);

const query = queryPulseboard("Which command queries customer evidence?", options);
assert.ok(Array.isArray(query.evidence));
assert.ok(query.answer.length > 0);

const lint = lintPulseboard(options);
assert.ok(["pass", "warnings"].includes(lint.status));
assert.ok(Array.isArray(lint.broken_links));

const tasks = listTasks(options);
assert.ok(Array.isArray(tasks.tasks));

const board = boardPulseboard(options);
assert.ok(board.lanes["To Do"]);
assert.ok(board.lanes["In Progress"]);
assert.ok(board.lanes["In Review"]);
assert.ok(board.lanes.Done);

const check = checkPulseboard(options);
assert.ok(["pass", "warnings"].includes(check.status));
assert.ok(Array.isArray(check.missing_cards));

const called = callTool("search", { query: "Injest customer calls", limit: 3 }, options);
assert.ok(called.results.length <= 3);

console.log("pulseboard mcp tests passed");
