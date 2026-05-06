#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    project: "",
    repoName: "",
    github: "",
    timezone: "Europe/Rome",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") options.project = argv[++index];
    else if (arg === "--repo-name") options.repoName = argv[++index];
    else if (arg === "--github") options.github = argv[++index];
    else if (arg === "--timezone") options.timezone = argv[++index];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  npm run init -- --project \"My Project\" --repo-name my-project --github owner/my-project",
    "",
    "Options:",
    "  --project NAME       Human project name.",
    "  --repo-name NAME     Local repository label used in summaries.",
    "  --github SLUG        Optional GitHub owner/repo slug.",
    "  --timezone TZ        IANA timezone. Default: Europe/Rome.",
  ].join("\n");
}

function kebab(value) {
  return String(value || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

function buildConfig(options) {
  const project = options.project || "Pulseboard";
  const repoName = options.repoName || kebab(project);
  return {
    project,
    timezone: options.timezone,
    working_days: [1, 2, 3, 4, 5],
    summary_dir: "project/summaries",
    task_states: ["todo", "in-progress", "in-review", "done"],
    areas: [
      "docs",
      "info",
      "frontend",
      "backend",
      "mobile",
      "api",
      "database",
      "design",
      "infrastructure",
      "tests",
      "automation",
      "integrations",
    ],
    categories: [
      {
        key: "feature",
        description: "New user-facing or workflow capability.",
        examples: ["Add Google login to onboarding."],
      },
      {
        key: "bug",
        description: "Broken or incorrect behavior.",
        examples: ["Fix checkout error when payment fails."],
      },
      {
        key: "chore",
        description: "Maintenance, tooling, cleanup, or operational work.",
        examples: ["Add digest automation to project startup."],
      },
      {
        key: "docs",
        description: "Documentation, project knowledge, or specification work.",
        examples: ["Document the plugin setup flow."],
      },
    ],
    priorities: [
      {
        key: "p0",
        description: "Urgent blocker or severe user impact.",
        examples: ["Users cannot access the product."],
      },
      {
        key: "p1",
        description: "Important near-term work.",
        examples: ["Add a required customer delivery flow."],
      },
      {
        key: "p2",
        description: "Useful planned work without immediate delivery pressure.",
        examples: ["Improve empty states."],
      },
      {
        key: "p3",
        description: "Low urgency cleanup or exploratory work.",
        examples: ["Rename an internal helper."],
      },
    ],
    repositories: [
      {
        name: repoName,
        path: ".",
        github: options.github || "",
        areas: ["docs", "automation", "integrations"],
      },
    ],
    docs: ["README.md", "AGENTS.md", "project", "plugins"],
    external_docs: [],
    knowledge_sources: ["raw/info", "raw/meetings", "raw/requests", "raw/specs"],
    activities: ["raw/activities"],
    issue_sync: {
      enabled: false,
      provider: "github",
      implementation_ready_statuses: ["todo", "in-progress"],
      local_only_categories: ["docs"],
    },
    plugins: {
      slack: { enabled: false, env: "SLACK_WEBHOOK_URL" },
      telegram: { enabled: false, env: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"] },
    },
  };
}

function configMarkdown(options) {
  const config = buildConfig(options);
  return [
    "---",
    "type: pulseboard-config",
    "title: Pulseboard Configuration",
    `updated: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    "# Pulseboard Configuration",
    "",
    "The summary tool reads the JSON block below. Keep secrets out of this file.",
    "",
    "```json",
    JSON.stringify(config, null, 2),
    "```",
    "",
  ].join("\n");
}

function markdownTableCell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
}

function countTaskRecords(root = ROOT) {
  const tasksDir = path.join(root, "project/tasks");
  if (!fs.existsSync(tasksDir)) return 0;
  return fs.readdirSync(tasksDir).filter((entry) => entry.endsWith(".md")).length;
}

function renderRepositoryRows(repositories) {
  if (!repositories.length) return ["No repositories are configured yet."];
  return [
    "| Repository | Path | GitHub | Areas |",
    "| --- | --- | --- | --- |",
    ...repositories.map((repo) => {
      const github = repo.github ? repo.github : "local only";
      const areas = Array.isArray(repo.areas) && repo.areas.length ? repo.areas.join(", ") : "not set";
      return `| ${markdownTableCell(repo.name || "project")} | \`${markdownTableCell(repo.path || ".")}\` | ${markdownTableCell(github)} | ${markdownTableCell(areas)} |`;
    }),
  ];
}

function readmeMarkdown(config, options = {}) {
  const project = config.project || "Project";
  const repositories = Array.isArray(config.repositories) ? config.repositories : [];
  const taskCount = Number.isInteger(options.taskCount) ? options.taskCount : 0;
  const currentStatus = taskCount
    ? `There ${taskCount === 1 ? "is" : "are"} ${taskCount} task record${taskCount === 1 ? "" : "s"} in [project/tasks/](project/tasks/). Open [project/board.md](project/board.md) in Obsidian for the canonical status board.`
    : "No task records exist yet. Start by asking an agent to add the first implementation, research, or planning task; it will create a task record and place it on the board.";

  return [
    `# ${project} Pulseboard`,
    "",
    `This repository is the local Pulseboard for ${project}. It keeps project status, task records, source-backed knowledge, graph artifacts, and optional daily activity digests in plain files that can be inspected and versioned.`,
    "",
    "Pulseboard is local-first: there is no inbound bot listener, database, vector store, hosted service, or shared AI account in the core. Optional Slack and Telegram integrations only post outbound summaries when explicitly configured.",
    "",
    "## Current Status",
    "",
    currentStatus,
    "",
    "Useful entry points:",
    "",
    "- [project/board.md](project/board.md): Obsidian Kanban status board.",
    "- [project/tasks/](project/tasks/): canonical task records.",
    "- [project/info/](project/info/): maintained product and project context.",
    "- [project/checks/](project/checks/): generated check reports.",
    "- [raw/activities/](raw/activities/): append-only source notes for work not captured in Git.",
    "- [raw/meetings/](raw/meetings/): append-only customer calls, interviews, and meeting transcripts.",
    "- [raw/requests/](raw/requests/): append-only customer requests, chats, support snippets, and sales notes.",
    "- [raw/specs/](raw/specs/): append-only specs, proposals, and product drafts.",
    "",
    "## Repositories",
    "",
    ...renderRepositoryRows(repositories),
    "",
    "Daily summaries read commits from these local paths, plus configured docs and raw activity notes. GitHub issue sync is optional and only applies to implementation-ready task records when a repository has a GitHub slug.",
    "",
    "## Project Commands",
    "",
    "Ask a coding agent that follows [AGENTS.md](AGENTS.md) to run project-management and knowledge-base commands in natural language:",
    "",
    "```text",
    `Configure this project for ${project}: categories feature, bug, chore; priorities p0-p3`,
    "Add \"Build the account settings page\"",
    "Update [[build-account-settings-page]] to in-progress",
    "Check the project wiki",
    "Injest these customer call notes into the knowledge base: ...",
    "Query the wiki: which future features are best supported by customer evidence?",
    "Lint the wiki",
    "Graph the project wiki",
    `Repurpose audit for ${project}`,
    "Sync GitHub issues",
    "```",
    "",
    "The board lanes are `To Do`, `In Progress`, `In Review`, and `Done`. Task status frontmatter and the board lane should always agree.",
    "",
    "## Local Checks",
    "",
    "Run the repository checks before finishing changes:",
    "",
    "```bash",
    "npm run check",
    "npm run summary -- --stdout",
    "```",
    "",
    "Use a dry run when you only need to verify summary generation without writing or posting:",
    "",
    "```bash",
    "npm run summary -- --dry-run",
    "```",
    "",
    "By default, the summary target is the previous working day; Monday summarizes Friday unless the configured working days change.",
    "",
    "## Configuration",
    "",
    "Edit [project/config.md](project/config.md). The summary tool reads the fenced JSON block in that file.",
    "",
    "Configured local docs and activity sources are the only inputs used for summaries. Keep credentials and webhook URLs out of tracked files; use `.pulseboard/plugins.json`, environment variables, or another local secret store.",
    "",
    "## Startup Hook",
    "",
    "This Pulseboard includes a project-local Codex hook in [.codex/config.toml](.codex/config.toml). When Codex opens this trusted project, the hook runs the idempotent startup summary command.",
    "",
    "The startup command:",
    "",
    "- Runs only during the configured morning window, default `06:00-12:00`.",
    "- Computes the previous working day.",
    "- Writes summaries under `project/summaries/`.",
    "- Posts to locally enabled plugins at most once per target day.",
    "- Records local state in `.pulseboard/startup-summary-state.json`.",
    "",
    "Any agent, editor, or scheduler can use the same command:",
    "",
    "```bash",
    "npm run agent-start",
    "```",
    "",
    "## Posting Plugins",
    "",
    "Slack and Telegram are optional outbound plugins. They are disabled unless local credentials and enabled plugin settings are supplied outside Git.",
    "",
    "Plugin setup notes live in:",
    "",
    "- [plugins/slack/README.md](plugins/slack/README.md)",
    "- [plugins/telegram/README.md](plugins/telegram/README.md)",
    "",
    "To post with locally configured plugins:",
    "",
    "```bash",
    "npm run summary -- --post all",
    "```",
    "",
    "## Scheduling",
    "",
    "Agent startup is the default lightweight automation path. Use cron, launchd, GitHub Actions on a trusted runner, or another scheduler only when summaries should run independently of opening an agent.",
    "",
    "Example weekday cron at 09:00:",
    "",
    "```cron",
    "0 9 * * 1-5 cd /path/to/project && npm run summary -- --post all",
    "```",
    "",
    "## Repurpose Audits",
    "",
    "Use `Repurpose audit` for a product, migration, cleanup, or reuse pass. The procedure reads configured local repositories and docs, plus explicitly configured external wiki/docs paths if present.",
    "",
    "The audit workflow creates append-only source notes under `raw/activities/`, maintained synthesis under `project/info/`, and concrete follow-up task records under `project/tasks/`.",
    "",
    "## GitHub Issue Sync",
    "",
    "Use `Sync GitHub issues` when selected task records should be mirrored to GitHub. The sync procedure lists existing open issues first, avoids duplicates, creates issues only from implementation-ready local tasks, and writes created issue URLs back into task frontmatter.",
    "",
    "Planning, coherence, research, audit, and info-maintenance tasks should usually remain local. Pulseboard task records and [project/board.md](project/board.md) remain the source of truth.",
    "",
    "## Creating Another Instance",
    "",
    "To create another Pulseboard instance from the template, initialize the new checkout with project-specific inputs:",
    "",
    "```bash",
    "npm run init -- --project \"My Project\" --repo-name my-project --github owner/my-project",
    "```",
    "",
    "Initialization rewrites this README as that project's local dashboard, updates [project/config.md](project/config.md), and creates `.pulseboard/plugins.json` from [plugins.example.json](plugins.example.json) when local plugin settings do not already exist.",
    "",
  ].join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  fs.writeFileSync(path.join(ROOT, "project/config.md"), configMarkdown(options));
  fs.writeFileSync(path.join(ROOT, "README.md"), readmeMarkdown(buildConfig(options), { taskCount: countTaskRecords() }));
  fs.mkdirSync(path.join(ROOT, ".pulseboard"), { recursive: true });
  const localPluginsPath = path.join(ROOT, ".pulseboard/plugins.json");
  if (!fs.existsSync(localPluginsPath)) {
    fs.copyFileSync(path.join(ROOT, "plugins.example.json"), localPluginsPath);
  }
  console.log("Pulseboard instance initialized.");
  console.log("README.md now describes this project-specific Pulseboard.");
  console.log("Edit .pulseboard/plugins.json with local Slack/Telegram credentials when ready.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  buildConfig,
  configMarkdown,
  countTaskRecords,
  kebab,
  readmeMarkdown,
};
