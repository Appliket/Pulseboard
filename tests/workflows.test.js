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
assert.match(readme, /Query/);
assert.match(readme, /Lint/);

console.log("workflow documentation tests passed");
