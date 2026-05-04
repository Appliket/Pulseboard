const assert = require("node:assert/strict");
const { configMarkdown, kebab } = require("../tools/init-template");

assert.equal(kebab("My Cool Project!"), "my-cool-project");

const markdown = configMarkdown({
  project: "Client Portal",
  repoName: "client-portal",
  github: "acme/client-portal",
  timezone: "Europe/Rome",
});

assert.match(markdown, /"project": "Client Portal"/);
assert.match(markdown, /"name": "client-portal"/);
assert.match(markdown, /"github": "acme\/client-portal"/);
assert.match(markdown, /"task_states": \[/);
assert.match(markdown, /"categories": \[/);
assert.match(markdown, /"priorities": \[/);
assert.match(markdown, /"external_docs": \[\]/);
assert.match(markdown, /"issue_sync": \{/);
assert.match(markdown, /"implementation_ready_statuses": \[/);

console.log("init template tests passed");
