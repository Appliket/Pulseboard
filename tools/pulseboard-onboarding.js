#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { buildConfig, configMarkdown, kebab, readmeMarkdown } = require("./init-template");

const ROOT = path.resolve(__dirname, "..");

function parseInstallMappings(value) {
  if (!value) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("PULSEBOARD_INSTALLS_JSON must be an object mapping install subjects to owner/repo slugs.");
  }
  return parsed;
}

function readInstallMappings(options = {}) {
  const mappings = parseInstallMappings(options.installsJson || process.env.PULSEBOARD_INSTALLS_JSON || "");
  const installsPath = options.installsPath || process.env.PULSEBOARD_INSTALLS_PATH || "";
  if (!installsPath) return mappings;
  if (!fs.existsSync(installsPath)) return mappings;
  return { ...mappings, ...parseInstallMappings(fs.readFileSync(installsPath, "utf8")) };
}

function writeInstallMapping(subject, repo, options = {}) {
  const installsPath = options.installsPath || process.env.PULSEBOARD_INSTALLS_PATH || "";
  if (!subject || !repo || !installsPath) return false;
  const existing = readInstallMappings({ ...options, installsPath });
  const next = { ...existing, [subject]: repo };
  fs.mkdirSync(path.dirname(installsPath), { recursive: true });
  fs.writeFileSync(installsPath, `${JSON.stringify(next, null, 2)}\n`);
  return true;
}

function resolveInstalledRepo(subject, options = {}) {
  const mappings = readInstallMappings(options);
  return mappings[subject] || mappings.default || options.defaultRepo || process.env.PULSEBOARD_DEFAULT_REPO || "";
}

function onboardingSchema() {
  return {
    title: "Create or connect a Pulseboard GitHub repository",
    required: ["project"],
    fields: [
      { name: "project", type: "string", description: "Human project name, for example Client Portal." },
      { name: "repo", type: "string", description: "Existing owner/repo slug. Omit when creating a new repo." },
      { name: "owner", type: "string", description: "GitHub organization for new repos. Omit for the authenticated user's account." },
      { name: "repo_name", type: "string", description: "New repository name. Defaults from project." },
      { name: "private", type: "boolean", description: "Create a private repository. Defaults to true." },
      { name: "timezone", type: "string", description: "IANA timezone for daily summaries. Defaults to Europe/Rome." },
      { name: "subject", type: "string", description: "Optional OAuth subject/install id to map to the created repo." },
    ],
    notes: [
      "POST these answers to /onboarding with a GitHub token in Authorization: Bearer <token> or configure GITHUB_TOKEN on the server.",
      "The response returns the owner/repo slug used by /mcp. Set PULSEBOARD_INSTALLS_JSON or PULSEBOARD_INSTALLS_PATH for automatic per-user repo routing.",
    ],
  };
}

function templateFiles(input = {}) {
  const project = input.project || "Pulseboard";
  const repoName = input.repoName || input.repo_name || kebab(project);
  const github = input.github || input.repo || "";
  const timezone = input.timezone || "Europe/Rome";
  const config = buildConfig({ project, repoName, github, timezone });
  const generated = new Map([
    ["README.md", readmeMarkdown(config, { taskCount: 0 })],
    ["project/config.md", configMarkdown({ project, repoName, github, timezone })],
  ]);
  const seedPaths = [
    "AGENTS.md",
    "package.json",
    "plugins.example.json",
    "commands/Add.md",
    "commands/Check.md",
    "commands/Configure.md",
    "commands/Graph.md",
    "commands/Injest.md",
    "commands/Lint.md",
    "commands/Query.md",
    "commands/Repurpose-Audit.md",
    "commands/Sync-GitHub-Issues.md",
    "commands/Update.md",
    "project/board.md",
    "project/index.md",
    "project/log.md",
    "project/info/index.md",
    "project/info/knowledge-base.md",
    "project/checks/check-template.md",
    "plugins/slack/README.md",
    "plugins/telegram/README.md",
    "plugins/chatgpt-mcp/README.md",
    "tools/agent-startup-summary.js",
    "tools/codex-startup-summary.js",
    "tools/daily-summary.js",
    "tools/init-template.js",
    "tools/pulseboard-mcp.js",
  ];
  const files = [];
  for (const file of seedPaths) {
    const absolute = path.join(ROOT, file);
    if (generated.has(file)) files.push({ path: file, content: generated.get(file) });
    else if (fs.existsSync(absolute)) files.push({ path: file, content: fs.readFileSync(absolute, "utf8") });
  }
  for (const [file, content] of generated) {
    if (!files.some((candidate) => candidate.path === file)) files.push({ path: file, content });
  }
  for (const file of [
    "project/tasks/.gitkeep",
    "project/summaries/.gitkeep",
    "raw/activities/.gitkeep",
    "raw/info/.gitkeep",
    "raw/meetings/.gitkeep",
    "raw/requests/.gitkeep",
    "raw/specs/.gitkeep",
  ]) {
    files.push({ path: file, content: "" });
  }
  return files;
}

function githubRequest(method, apiPath, body, token) {
  if (!token) throw new Error("GitHub onboarding requires a token.");
  const url = `https://api.github.com${apiPath}`;
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async (response) => {
    const text = await response.text();
    const value = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = value && value.message ? value.message : text || response.statusText;
      throw new Error(`GitHub API ${method} ${apiPath} failed: ${message}`);
    }
    return value;
  });
}

function splitRepo(repo) {
  const match = String(repo || "").match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) throw new Error("Repository must be an owner/repo slug.");
  return { owner: match[1], name: match[2], fullName: `${match[1]}/${match[2]}` };
}

async function createRepository(input, token) {
  const project = input.project || "Pulseboard";
  const name = input.repo_name || input.repoName || (input.repo ? splitRepo(input.repo).name : kebab(project));
  const owner = input.owner || "";
  const payload = {
    name,
    private: input.private !== false,
    description: input.description || `Pulseboard wiki for ${project}`,
    auto_init: false,
  };
  const repo = owner
    ? await githubRequest("POST", `/orgs/${encodeURIComponent(owner)}/repos`, payload, token)
    : await githubRequest("POST", "/user/repos", payload, token);
  return repo.full_name;
}

async function fileSha(repo, filePath, token, branch) {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const suffix = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  try {
    const data = await githubRequest("GET", `/repos/${repo}/contents/${encodedPath}${suffix}`, undefined, token);
    return data.sha || "";
  } catch (error) {
    if (String(error.message).includes("Not Found")) return "";
    throw error;
  }
}

async function putFile(repo, file, token, branch = "") {
  const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
  const body = {
    message: `pulseboard: initialize ${file.path}`,
    content: Buffer.from(file.content.endsWith("\n") ? file.content : `${file.content}\n`).toString("base64"),
  };
  if (branch) body.branch = branch;
  const sha = await fileSha(repo, file.path, token, branch);
  if (sha) body.sha = sha;
  await githubRequest("PUT", `/repos/${repo}/contents/${encodedPath}`, body, token);
}

async function initializeRepository(repo, input, token) {
  const files = templateFiles({ ...input, repo });
  for (const file of files) {
    await putFile(repo, file, token, input.ref || "");
  }
  return files.map((file) => file.path);
}

async function setupPulseboardRepository(input = {}, options = {}) {
  if (!input.project) throw new Error("project is required.");
  const token = input.github_token || options.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const repo = input.create_repository === false && input.repo
    ? splitRepo(input.repo).fullName
    : await createRepository(input, token);
  const files = await initializeRepository(repo, input, token);
  const mappingPersisted = writeInstallMapping(input.subject || options.subject || "", repo, options);
  return {
    repo,
    html_url: `https://github.com/${repo}`,
    files,
    mapping_persisted: mappingPersisted,
    install_mapping: input.subject ? { [input.subject]: repo } : undefined,
    next_steps: [
      `Set PULSEBOARD_STORAGE=github and PULSEBOARD_GITHUB_REPO=${repo} for a single-tenant deployment.`,
      "For multi-tenant routing, set PULSEBOARD_INSTALLS_JSON to map OAuth subjects/install ids to repos, or set PULSEBOARD_INSTALLS_PATH on a writable host.",
    ],
  };
}

module.exports = {
  onboardingSchema,
  parseInstallMappings,
  readInstallMappings,
  resolveInstalledRepo,
  setupPulseboardRepository,
  splitRepo,
  templateFiles,
  writeInstallMapping,
};
