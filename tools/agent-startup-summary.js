#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  postSummary,
  previousWorkingDay,
  readConfig,
  readLocalSettings,
  renderSummary,
  summarize,
} = require("./daily-summary");

const ROOT = path.resolve(__dirname, "..");
const STATE_PATH = path.resolve(ROOT, ".trackalo/startup-summary-state.json");

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function isMorning(now, settings) {
  const window = settings.morning_window || {};
  const start = Number.isInteger(window.start_hour) ? window.start_hour : 6;
  const end = Number.isInteger(window.end_hour) ? window.end_hour : 12;
  const hour = now.getHours();
  return hour >= start && hour < end;
}

async function run(options = {}) {
  const now = options.now || new Date();
  const settings = readLocalSettings();
  if (settings.auto_on_agent_start === false || settings.auto_on_codex_start === false) return { skipped: "disabled" };
  if (!options.force && !isMorning(now, settings)) return { skipped: "outside morning window" };

  const config = readConfig(process.env.TRACKALO_CONFIG || "project/config.md");
  const workingDays = new Set(config.working_days || [1, 2, 3, 4, 5]);
  const targetDate = options.date || previousWorkingDay(now, workingDays);
  const state = loadState();
  const hasEnabledPlugins = Boolean(settings.enabled && settings.enabled.length);
  if (!options.force && hasEnabledPlugins && state.last_posted_target_date === targetDate) {
    return { skipped: `already posted ${targetDate}` };
  }

  const summary = summarize(config, targetDate);
  const markdown = renderSummary(summary);
  const outputPath = path.resolve(ROOT, config.summary_dir || "project/summaries", `${targetDate}.md`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown);

  if (hasEnabledPlugins) {
    await postSummary("all", summary);
    state.last_posted_target_date = targetDate;
    state.last_posted_at = now.toISOString();
  }

  state.last_checked_date = localDateString(now);
  state.last_generated_target_date = targetDate;
  state.last_generated_at = now.toISOString();
  saveState(state);
  return {
    generated: targetDate,
    posted: hasEnabledPlugins ? targetDate : "",
    output: path.relative(ROOT, outputPath),
  };
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  run({ force }).then((result) => {
    if (process.env.TRACKALO_STARTUP_VERBOSE === "1") {
      console.log(JSON.stringify(result));
    }
  }).catch((error) => {
    console.error(`Trackalo startup summary failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  isMorning,
  run,
};
