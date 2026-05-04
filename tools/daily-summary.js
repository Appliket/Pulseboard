#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG = "project/config.md";
const DEFAULT_SUMMARY_DIR = "project/summaries";
const WEEKDAYS = new Set([1, 2, 3, 4, 5]);

function parseArgs(argv) {
  const options = {
    config: process.env.PULSEBOARD_CONFIG || process.env.TRACKALO_CONFIG || DEFAULT_CONFIG,
    date: "",
    stdout: false,
    dryRun: false,
    post: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") options.config = argv[++index];
    else if (arg === "--date") options.date = argv[++index];
    else if (arg === "--stdout") options.stdout = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--post") options.post = argv[++index];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage: npm run summary -- [options]",
    "",
    "Options:",
    "  --date YYYY-MM-DD       Summarize a specific day. Default: previous working day.",
    "  --stdout                Print the summary markdown.",
    "  --dry-run               Do not write or post.",
    "  --post slack|telegram|all",
    "  --config PATH           Config markdown with a fenced JSON block.",
  ].join("\n");
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid date: ${value}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function previousWorkingDay(from = new Date(), workingDays = WEEKDAYS) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  do {
    date.setDate(date.getDate() - 1);
  } while (!workingDays.has(date.getDay()));
  return localDateString(date);
}

function nextDateString(dateString) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + 1);
  return localDateString(date);
}

function readConfig(configPath) {
  const absolute = path.resolve(ROOT, configPath);
  const text = fs.readFileSync(absolute, "utf8");
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) throw new Error(`${configPath} must contain a fenced json config block.`);
  const config = JSON.parse(match[1]);
  config.repositories = config.repositories || [];
  config.docs = config.docs || [];
  config.activities = config.activities || ["raw/activities"];
  config.summary_dir = process.env.PULSEBOARD_SUMMARY_DIR || process.env.TRACKALO_SUMMARY_DIR || config.summary_dir || DEFAULT_SUMMARY_DIR;
  return config;
}

function readLocalSettings() {
  const settingsPath = path.resolve(ROOT, ".pulseboard/plugins.json");
  if (!fs.existsSync(settingsPath)) return {};
  return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
}

function runGit(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (error) {
    return "";
  }
}

function listCommitFiles(repoPath, hash) {
  return runGit(["show", "--pretty=format:", "--name-only", hash], repoPath)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function collectRepositoryActivity(config, targetDate) {
  const nextDate = nextDateString(targetDate);
  return config.repositories.map((repo) => {
    const repoPath = path.resolve(ROOT, repo.path || ".");
    const output = runGit(
      [
        "log",
        `--since=${targetDate} 00:00:00`,
        `--until=${nextDate} 00:00:00`,
        "--date=short",
        "--pretty=format:%H%x09%h%x09%an%x09%ad%x09%s",
      ],
      repoPath,
    );
    const commits = output
      ? output.split("\n").map((line) => {
          const [hash, shortHash, author, date, ...subjectParts] = line.split("\t");
          return {
            hash,
            shortHash,
            author,
            date,
            subject: subjectParts.join("\t"),
            files: listCommitFiles(repoPath, hash),
          };
        })
      : [];
    return {
      name: repo.name || path.basename(repoPath),
      path: repo.path || ".",
      github: repo.github || "",
      commits,
    };
  });
}

function walkFiles(relativePath) {
  const absolute = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [relativePath];
  return fs.readdirSync(absolute)
    .flatMap((entry) => walkFiles(path.join(relativePath, entry)))
    .filter((file) => !file.includes(`${path.sep}summaries${path.sep}`));
}

function collectFileActivity(paths, targetDate) {
  return paths
    .flatMap(walkFiles)
    .filter((file) => /\.(md|json|txt|yml|yaml)$/i.test(file))
    .map((file) => {
      const stat = fs.statSync(path.resolve(ROOT, file));
      return { path: file, modified: localDateString(stat.mtime), size: stat.size };
    })
    .filter((file) => file.modified === targetDate)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function readActivityNotes(paths, targetDate) {
  return paths
    .flatMap(walkFiles)
    .filter((file) => path.basename(file).startsWith(targetDate))
    .filter((file) => /\.(md|txt)$/i.test(file))
    .map((file) => {
      const text = fs.readFileSync(path.resolve(ROOT, file), "utf8").trim();
      return { path: file, text };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function summarize(config, targetDate) {
  const repositories = collectRepositoryActivity(config, targetDate);
  const docs = collectFileActivity(config.docs, targetDate);
  const notes = readActivityNotes(config.activities, targetDate);
  return { targetDate, generatedAt: new Date().toISOString(), repositories, docs, notes };
}

function renderSummary(summary) {
  const lines = [
    `# Daily Summary - ${summary.targetDate}`,
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "## Repository Activity",
    "",
  ];

  let activityCount = 0;
  for (const repo of summary.repositories) {
    lines.push(`### ${repo.name}`);
    lines.push("");
    if (!repo.commits.length) {
      lines.push("- No commits found.");
      lines.push("");
      continue;
    }
    activityCount += repo.commits.length;
    for (const commit of repo.commits) {
      lines.push(`- ${commit.subject} (${commit.shortHash}, ${commit.author})`);
      for (const file of commit.files.slice(0, 8)) lines.push(`  - ${file}`);
      if (commit.files.length > 8) lines.push(`  - ...${commit.files.length - 8} more files`);
    }
    lines.push("");
  }

  lines.push("## Docs And Local Activity");
  lines.push("");
  if (!summary.docs.length && !summary.notes.length) {
    lines.push("- No document or raw activity updates found.");
  } else {
    activityCount += summary.docs.length + summary.notes.length;
    for (const doc of summary.docs) lines.push(`- Updated ${doc.path}`);
    for (const note of summary.notes) {
      const firstLine = note.text.split("\n").find(Boolean) || "Activity note";
      lines.push(`- ${note.path}: ${firstLine.replace(/^#\s*/, "")}`);
    }
  }

  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(activityCount ? `- Found ${activityCount} activity item(s) for ${summary.targetDate}.` : "- No related activity found for this day.");
  lines.push("");
  return lines.join("\n");
}

function renderPostText(summary) {
  const commits = summary.repositories.reduce((count, repo) => count + repo.commits.length, 0);
  const docs = summary.docs.length + summary.notes.length;
  const headlines = summary.repositories
    .flatMap((repo) => repo.commits.map((commit) => `- ${commit.subject} (${repo.name})`))
    .slice(0, 8);
  return [
    `Pulseboard daily summary for ${summary.targetDate}`,
    `${commits} commit(s), ${docs} doc/activity update(s).`,
    "",
    ...(headlines.length ? headlines : ["No related activity found."]),
  ].join("\n");
}

async function postSlack(text, settings = readLocalSettings()) {
  const url = process.env.SLACK_WEBHOOK_URL || (settings.slack && settings.slack.webhook_url);
  if (!url) throw new Error("Slack webhook is not configured. Set SLACK_WEBHOOK_URL or .pulseboard/plugins.json slack.webhook_url.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`Slack post failed: ${response.status}`);
}

async function postTelegram(text, settings = readLocalSettings()) {
  const telegram = settings.telegram || {};
  const token = process.env.TELEGRAM_BOT_TOKEN || telegram.bot_token;
  const chatId = process.env.TELEGRAM_CHAT_ID || telegram.chat_id;
  if (!token || !chatId) throw new Error("Telegram is not configured. Set TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID or .pulseboard/plugins.json telegram credentials.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) throw new Error(`Telegram post failed: ${response.status}`);
}

async function postSummary(target, summary) {
  const text = renderPostText(summary);
  const settings = readLocalSettings();
  if (target === "slack") return postSlack(text, settings);
  if (target === "telegram") return postTelegram(text, settings);
  if (target === "all") {
    const enabled = settings.enabled || [];
    const targets = enabled.length ? enabled : ["slack", "telegram"];
    for (const item of targets) {
      if (item === "slack") await postSlack(text, settings);
      else if (item === "telegram") await postTelegram(text, settings);
    }
    return undefined;
  }
  throw new Error(`Unknown post target: ${target}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const config = readConfig(options.config);
  const workingDays = new Set(config.working_days || [1, 2, 3, 4, 5]);
  const targetDate = options.date || previousWorkingDay(new Date(), workingDays);
  const summary = summarize(config, targetDate);
  const markdown = renderSummary(summary);
  const outputPath = path.resolve(ROOT, config.summary_dir, `${targetDate}.md`);

  if (options.stdout || options.dryRun) console.log(markdown);
  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
  }
  if (options.post && !options.dryRun) await postSummary(options.post, summary);
  if (!options.stdout && !options.dryRun) console.log(`Summary written: ${path.relative(ROOT, outputPath)}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  collectFileActivity,
  nextDateString,
  postSummary,
  previousWorkingDay,
  readConfig,
  readLocalSettings,
  renderPostText,
  renderSummary,
  summarize,
};
