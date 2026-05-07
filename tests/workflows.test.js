const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

for (const command of ["Lint.md", "Query.md", "Repurpose-Audit.md", "Sync-GitHub-Issues.md"]) {
  assert.ok(fs.existsSync(path.join(ROOT, "commands", command)), `${command} should exist`);
}

const injest = read("commands/Injest.md");
assert.match(injest, /raw\/meetings\/YYYY-MM-DD-<topic>\.md/);
assert.match(injest, /raw\/requests\/YYYY-MM-DD-<topic>\.md/);
assert.match(injest, /Run `Lint` when the ingestion changes project knowledge/);

const lint = read("commands/Lint.md");
assert.match(lint, /knowledge_sources/);
assert.match(lint, /project\/checks\/YYYY-MM-DD-lint\.md/);
assert.match(lint, /maintained claims that lack a source link/);

const query = read("commands/Query.md");
assert.match(query, /Separate evidence from inference/);
assert.match(query, /knowledge_sources/);
assert.match(query, /Do not invent activity, customer intent, commitments, or priorities/);

const repurpose = read("commands/Repurpose-Audit.md");
assert.match(repurpose, /raw\/activities\/YYYY-MM-DD-<topic>-repurpose-audit\.md/);
assert.match(repurpose, /project\/info\/<topic>-plan\.md/);
assert.match(repurpose, /small number of high-signal task records/);
assert.match(repurpose, /Do not mutate existing `raw\/` files/);

const sync = read("commands/Sync-GitHub-Issues.md");
assert.match(sync, /List existing open GitHub issues/);
assert.match(sync, /has no `github_issue`/);
assert.match(sync, /Write each created issue URL back/);
assert.match(sync, /tracked-file secret scan/);

const agents = read("AGENTS.md");
assert.match(agents, /Planning, coherence, research, audit, and info-maintenance tasks should usually stay local/);
assert.match(agents, /GitHub issue sync is optional/);
assert.match(agents, /Knowledge Base Rules/);
assert.match(agents, /commands\/Lint\.md/);
assert.match(agents, /commands\/Query\.md/);

const readme = read("README.md");
assert.match(readme, /## Repurpose Audits/);
assert.match(readme, /## GitHub Issue Sync/);
assert.match(readme, /## Knowledge Base Commands/);
assert.match(readme, /## ChatGPT MCP Adapter/);
assert.match(readme, /## Repository Split/);
assert.match(readme, /Query/);
assert.match(readme, /Lint/);

const obsidianTemplate = read("templates/obsidian/README.md");
assert.match(obsidianTemplate, /standalone Obsidian template seed/);
assert.match(obsidianTemplate, /does not include the ChatGPT\/MCP server/);

const obsidianPackage = read("templates/obsidian/package.json");
assert.match(obsidianPackage, /pulseboard-obsidian-template/);
assert.doesNotMatch(obsidianPackage, /mcp:http|@modelcontextprotocol/);

const chatgptMcp = read("plugins/chatgpt-mcp/README.md");
assert.match(chatgptMcp, /GitHub-backed mode/);
assert.match(chatgptMcp, /Streamable HTTP/);
assert.match(chatgptMcp, /Render Deployment/);
assert.match(chatgptMcp, /PULSEBOARD_INSTALLS_PATH=\/var\/data\/pulseboard-installs\.json/);
assert.match(chatgptMcp, /GITHUB_APP_ID/);
assert.match(chatgptMcp, /GITHUB_APP_PRIVATE_KEY/);
assert.match(chatgptMcp, /PULSEBOARD_ENABLE_WRITE_TOOLS=1/);
assert.match(chatgptMcp, /PULSEBOARD_ALLOW_NOAUTH_WRITES=1/);
assert.match(chatgptMcp, /verifies bearer JWTs/);
assert.match(chatgptMcp, /create_ingest_pr/);
assert.match(chatgptMcp, /create_task_pr/);
assert.match(chatgptMcp, /update_task_pr/);
assert.match(chatgptMcp, /open pull requests instead of committing directly to `main`/);

const render = read("render.yaml");
assert.match(render, /type: web/);
assert.match(render, /runtime: node/);
assert.match(render, /startCommand: npm start/);
assert.match(render, /mountPath: \/var\/data/);
assert.match(render, /PULSEBOARD_INSTALLS_PATH/);
assert.match(render, /GITHUB_APP_ID/);
assert.match(render, /GITHUB_APP_PRIVATE_KEY/);

console.log("workflow documentation tests passed");
