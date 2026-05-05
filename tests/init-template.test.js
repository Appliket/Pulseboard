const assert = require("node:assert/strict");
const { buildConfig, configMarkdown, kebab, readmeMarkdown } = require("../tools/init-template");

assert.equal(kebab("My Cool Project!"), "my-cool-project");

const options = {
  project: "Client Portal",
  repoName: "client-portal",
  github: "acme/client-portal",
  timezone: "Europe/Rome",
};

const markdown = configMarkdown(options);

assert.match(markdown, /"project": "Client Portal"/);
assert.match(markdown, /"name": "client-portal"/);
assert.match(markdown, /"github": "acme\/client-portal"/);
assert.match(markdown, /"task_states": \[/);
assert.match(markdown, /"categories": \[/);
assert.match(markdown, /"priorities": \[/);
assert.match(markdown, /"external_docs": \[\]/);
assert.match(markdown, /"issue_sync": \{/);
assert.match(markdown, /"implementation_ready_statuses": \[/);

const readme = readmeMarkdown(buildConfig(options), { taskCount: 0 });

assert.match(readme, /^# Client Portal Pulseboard/);
assert.match(readme, /local Pulseboard for Client Portal/);
assert.match(readme, /## Current Status/);
assert.match(readme, /No task records exist yet/);
assert.match(readme, /## Repositories/);
assert.match(readme, /\| client-portal \| `\.` \| acme\/client-portal \|/);
assert.match(readme, /## Project Commands/);
assert.match(readme, /Add "Build the account settings page"/);
assert.match(readme, /## Local Checks/);
assert.match(readme, /npm run check/);
assert.match(readme, /npm run summary -- --stdout/);
assert.match(readme, /\[project\/board\.md\]\(project\/board\.md\)/);
assert.match(readme, /\[project\/tasks\/\]\(project\/tasks\/\)/);
assert.match(readme, /\[project\/info\/\]\(project\/info\/\)/);
assert.match(readme, /\[project\/checks\/\]\(project\/checks\/\)/);
assert.match(readme, /\[raw\/activities\/\]\(raw\/activities\/\)/);
assert.match(readme, /Slack and Telegram are optional outbound plugins/);
assert.doesNotMatch(readme, /hooks\.slack\.com/);
assert.doesNotMatch(readme, /TELEGRAM_BOT_TOKEN="[^"]+"/);

console.log("init template tests passed");
