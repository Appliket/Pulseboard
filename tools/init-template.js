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

function configMarkdown(options) {
  const project = options.project || "My Project";
  const repoName = options.repoName || kebab(project);
  const config = {
    project,
    timezone: options.timezone,
    working_days: [1, 2, 3, 4, 5],
    summary_dir: "project/summaries",
    repositories: [
      {
        name: repoName,
        path: ".",
        github: options.github || "",
        areas: ["docs", "automation", "integrations"],
      },
    ],
    docs: ["README.md", "AGENTS.md", "project", "plugins"],
    activities: ["raw/activities"],
    plugins: {
      slack: { enabled: false, env: "SLACK_WEBHOOK_URL" },
      telegram: { enabled: false, env: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"] },
    },
  };

  return [
    "---",
    "type: trackalo-config",
    "title: Trackalo Configuration",
    `updated: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    "# Trackalo Configuration",
    "",
    "The summary tool reads the JSON block below. Keep secrets out of this file.",
    "",
    "```json",
    JSON.stringify(config, null, 2),
    "```",
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
  fs.mkdirSync(path.join(ROOT, ".trackalo"), { recursive: true });
  const localPluginsPath = path.join(ROOT, ".trackalo/plugins.json");
  if (!fs.existsSync(localPluginsPath)) {
    fs.copyFileSync(path.join(ROOT, "plugins.example.json"), localPluginsPath);
  }
  console.log("Template initialized.");
  console.log("Edit .trackalo/plugins.json with local Slack/Telegram credentials when ready.");
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
  configMarkdown,
  kebab,
};
