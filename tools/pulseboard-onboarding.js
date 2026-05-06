#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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

function normalizeInstallRecord(value) {
  if (!value) return {};
  if (typeof value === "string") return { repo: value };
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      repo: value.repo || "",
      installation_id: value.installation_id || value.installationId || "",
    };
  }
  return {};
}

function readInstallMappings(options = {}) {
  const mappings = parseInstallMappings(options.installsJson || process.env.PULSEBOARD_INSTALLS_JSON || "");
  const installsPath = options.installsPath || process.env.PULSEBOARD_INSTALLS_PATH || "";
  if (!installsPath) return mappings;
  if (!fs.existsSync(installsPath)) return mappings;
  return { ...mappings, ...parseInstallMappings(fs.readFileSync(installsPath, "utf8")) };
}

function writeInstallMapping(subject, record, options = {}) {
  const installsPath = options.installsPath || process.env.PULSEBOARD_INSTALLS_PATH || "";
  const normalized = normalizeInstallRecord(record);
  if (!subject || !normalized.repo || !installsPath) return false;
  const existing = readInstallMappings({ ...options, installsPath });
  const next = { ...existing, [subject]: normalized };
  fs.mkdirSync(path.dirname(installsPath), { recursive: true });
  fs.writeFileSync(installsPath, `${JSON.stringify(next, null, 2)}\n`);
  return true;
}

function resolveInstall(subject, options = {}) {
  const mappings = readInstallMappings(options);
  const mapped = normalizeInstallRecord(mappings[subject] || mappings.default);
  if (mapped.repo) return mapped;
  return {
    repo: options.defaultRepo || process.env.PULSEBOARD_DEFAULT_REPO || "",
    installation_id: options.githubInstallationId || process.env.GITHUB_INSTALLATION_ID || "",
  };
}

function resolveInstalledRepo(subject, options = {}) {
  return resolveInstall(subject, options).repo;
}

function onboardingSchema() {
  return {
    title: "Create or connect a Pulseboard GitHub repository",
    required: ["project"],
    fields: [
      { name: "project", type: "string", description: "Human project name, for example Client Portal." },
      { name: "repo", type: "string", description: "Existing owner/repo slug. Omit when creating a new repo." },
      { name: "owner", type: "string", description: "GitHub account or organization where the GitHub App is installed. Required when creating a repo with installation_id." },
      { name: "repo_name", type: "string", description: "New repository name. Defaults from project." },
      { name: "private", type: "boolean", description: "Create a private repository. Defaults to true." },
      { name: "timezone", type: "string", description: "IANA timezone for daily summaries. Defaults to Europe/Rome." },
      { name: "installation_id", type: "string", description: "GitHub App installation id for short-lived installation tokens." },
      { name: "subject", type: "string", description: "Optional OAuth subject/install id to map to the created repo." },
    ],
    notes: [
      "Install the GitHub App, then POST these answers to /onboarding with installation_id. The server mints a short-lived installation token from GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.",
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

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function githubAppPrivateKey(options = {}) {
  return String(options.githubAppPrivateKey || process.env.GITHUB_APP_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n");
}

function createGitHubAppJwt(options = {}) {
  const appId = options.githubAppId || process.env.GITHUB_APP_ID || "";
  const privateKey = githubAppPrivateKey(options);
  if (!appId || !privateKey) throw new Error("GitHub App auth requires GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iat: now - 60,
    exp: now + (9 * 60),
    iss: String(appId),
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

async function githubInstallationAccessToken(installationId, options = {}) {
  if (!installationId) throw new Error("GitHub App auth requires installation_id.");
  const jwt = createGitHubAppJwt(options);
  const data = await githubRequest(
    "POST",
    `/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    undefined,
    jwt,
  );
  return data.token || "";
}

async function githubAuthToken(input = {}, options = {}) {
  if (input.github_token || options.githubToken) return input.github_token || options.githubToken;
  const installationId = input.installation_id || input.installationId || options.githubInstallationId || options.installationId || "";
  if (installationId) return githubInstallationAccessToken(installationId, options);
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
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
  if ((input.installation_id || input.installationId) && !owner) {
    throw new Error("owner is required when creating a repository with a GitHub App installation_id.");
  }
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
  const installationId = input.installation_id || input.installationId || options.githubInstallationId || options.installationId || "";
  const token = await githubAuthToken(input, options);
  const repo = input.create_repository === false && input.repo
    ? splitRepo(input.repo).fullName
    : await createRepository(input, token);
  const files = await initializeRepository(repo, input, token);
  const installRecord = { repo, installation_id: installationId };
  const mappingPersisted = writeInstallMapping(input.subject || options.subject || installationId, installRecord, options);
  return {
    repo,
    html_url: `https://github.com/${repo}`,
    files,
    mapping_persisted: mappingPersisted,
    install_mapping: input.subject || installationId ? { [input.subject || installationId]: installRecord } : undefined,
    next_steps: [
      `Set PULSEBOARD_STORAGE=github and PULSEBOARD_GITHUB_REPO=${repo} for a single-tenant deployment.`,
      "For multi-tenant routing, keep PULSEBOARD_INSTALLS_PATH on persistent storage so OAuth subjects/install ids resolve to repos and GitHub App installations.",
    ],
  };
}

module.exports = {
  onboardingSchema,
  createGitHubAppJwt,
  githubAuthToken,
  githubInstallationAccessToken,
  parseInstallMappings,
  readInstallMappings,
  resolveInstall,
  resolveInstalledRepo,
  setupPulseboardRepository,
  splitRepo,
  templateFiles,
  writeInstallMapping,
};
