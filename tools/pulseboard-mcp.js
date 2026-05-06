#!/usr/bin/env node
const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const z = require("zod/v4");
const {
  createGitHubAppJwt,
  onboardingSchema,
  resolveInstall,
  setupPulseboardRepository,
} = require("./pulseboard-onboarding");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG = "project/config.md";
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yml", ".yaml"]);

function parseArgs(argv) {
  const options = {
    mode: process.env.PULSEBOARD_STORAGE || "local",
    config: process.env.PULSEBOARD_CONFIG || DEFAULT_CONFIG,
    repo: process.env.PULSEBOARD_GITHUB_REPO || "",
    ref: process.env.PULSEBOARD_GITHUB_REF || "main",
    root: process.env.PULSEBOARD_ROOT || ROOT,
    transport: "stdio",
    host: process.env.HOST || process.env.PULSEBOARD_MCP_HOST || "127.0.0.1",
    port: Number(process.env.PORT || process.env.PULSEBOARD_MCP_PORT || 8787),
    enableWrites: process.env.PULSEBOARD_ENABLE_WRITE_TOOLS === "1",
    allowNoAuthWrites: process.env.PULSEBOARD_ALLOW_NOAUTH_WRITES === "1",
    publicUrl: process.env.PULSEBOARD_PUBLIC_URL || "",
    oauthIssuer: process.env.PULSEBOARD_OAUTH_ISSUER || "",
    oauthAudience: process.env.PULSEBOARD_OAUTH_AUDIENCE || process.env.PULSEBOARD_PUBLIC_URL || "",
    oauthJwksUrl: process.env.PULSEBOARD_OAUTH_JWKS_URL || "",
    installsJson: process.env.PULSEBOARD_INSTALLS_JSON || "",
    installsPath: process.env.PULSEBOARD_INSTALLS_PATH || "",
    defaultRepo: process.env.PULSEBOARD_DEFAULT_REPO || "",
    githubAppId: process.env.GITHUB_APP_ID || "",
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY || "",
    githubInstallationId: process.env.GITHUB_INSTALLATION_ID || "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") options.mode = argv[++index];
    else if (arg === "--config") options.config = argv[++index];
    else if (arg === "--repo") options.repo = argv[++index];
    else if (arg === "--ref") options.ref = argv[++index];
    else if (arg === "--root") options.root = path.resolve(argv[++index]);
    else if (arg === "--http") options.transport = "http";
    else if (arg === "--stdio") options.transport = "stdio";
    else if (arg === "--host") options.host = argv[++index];
    else if (arg === "--port") options.port = Number(argv[++index]);
    else if (arg === "--enable-writes") options.enableWrites = true;
    else if (arg === "--allow-noauth-writes") options.allowNoAuthWrites = true;
    else if (arg === "--public-url") options.publicUrl = argv[++index];
    else if (arg === "--oauth-issuer") options.oauthIssuer = argv[++index];
    else if (arg === "--oauth-audience") options.oauthAudience = argv[++index];
    else if (arg === "--oauth-jwks-url") options.oauthJwksUrl = argv[++index];
    else if (arg === "--default-repo") options.defaultRepo = argv[++index];
    else if (arg === "--github-installation-id") options.githubInstallationId = argv[++index];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node tools/pulseboard-mcp.js --stdio",
    "  node tools/pulseboard-mcp.js --http --host 127.0.0.1 --port 8787",
    "",
    "Storage:",
    "  --mode local|github",
    "  --repo owner/repo          Required for github mode.",
    "  --ref branch-or-sha        Default: main.",
    "",
    "Environment:",
    "  PULSEBOARD_STORAGE=local|github",
    "  PULSEBOARD_GITHUB_REPO=owner/repo",
    "  PULSEBOARD_GITHUB_REF=main",
    "  PULSEBOARD_ENABLE_WRITE_TOOLS=1",
    "  PULSEBOARD_ALLOW_NOAUTH_WRITES=1",
    "  PULSEBOARD_PUBLIC_URL=https://pulseboard.example.com",
    "  PULSEBOARD_OAUTH_ISSUER=https://auth.example.com",
    "  PULSEBOARD_OAUTH_AUDIENCE=https://pulseboard.example.com",
    "  PULSEBOARD_OAUTH_JWKS_URL=https://auth.example.com/.well-known/jwks.json",
    "  PULSEBOARD_INSTALLS_JSON='{\"oauth-sub\":\"owner/repo\"}'",
    "  PULSEBOARD_DEFAULT_REPO=owner/repo",
    "  GITHUB_APP_ID=12345",
    "  GITHUB_APP_PRIVATE_KEY=<private-key-pem>",
    "  GITHUB_INSTALLATION_ID=12345",
  ].join("\n");
}

function parseConfigMarkdown(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) throw new Error("Config markdown must contain a fenced json block.");
  const config = JSON.parse(match[1]);
  config.docs = config.docs || [];
  config.activities = config.activities || ["raw/activities"];
  config.knowledge_sources = config.knowledge_sources || ["raw/info", "raw/meetings", "raw/requests", "raw/specs"];
  return config;
}

function readLocalFile(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(path.resolve(root) + path.sep) && absolute !== path.resolve(root)) {
    throw new Error(`Path escapes Pulseboard root: ${relativePath}`);
  }
  return fs.readFileSync(absolute, "utf8");
}

function walkLocal(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [relativePath];
  return fs.readdirSync(absolute)
    .filter((entry) => !entry.startsWith("."))
    .flatMap((entry) => walkLocal(root, path.join(relativePath, entry)));
}

function githubInstallationAccessTokenSync(installationId, options = {}) {
  if (!installationId) return "";
  const jwt = createGitHubAppJwt(options);
  const output = execFileSync("curl", [
    "--fail",
    "--silent",
    "--show-error",
    "--request",
    "POST",
    "--header",
    "accept: application/vnd.github+json",
    "--header",
    `authorization: Bearer ${jwt}`,
    "--header",
    "x-github-api-version: 2022-11-28",
    `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const data = JSON.parse(output);
  return data.token || "";
}

function githubToken(options = {}) {
  if (options.githubToken) return options.githubToken;
  const installationId = options.githubInstallationId || options.installationId || process.env.GITHUB_INSTALLATION_ID || "";
  if (installationId) return githubInstallationAccessTokenSync(installationId, options);
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function githubRequest(method, apiPath, body, token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "") {
  const args = [
    "--fail",
    "--silent",
    "--show-error",
    "--request",
    method,
    "--header",
    "accept: application/vnd.github+json",
    "--header",
    "x-github-api-version: 2022-11-28",
  ];
  if (token) args.push("--header", `authorization: Bearer ${token}`);
  if (body !== undefined) args.push("--header", "content-type: application/json", "--data", JSON.stringify(body));
  args.push(`https://api.github.com${apiPath}`);
  try {
    const output = execFileSync("curl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return output ? JSON.parse(output) : {};
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message;
    throw new Error(`GitHub API ${method} ${apiPath} failed: ${detail}`);
  }
}

function githubTree(repo, ref, token) {
  const encodedRef = encodeURIComponent(ref);
  const data = githubRequest("GET", `/repos/${repo}/git/trees/${encodedRef}?recursive=1`, undefined, token);
  return (data.tree || [])
    .filter((item) => item.type === "blob")
    .map((item) => item.path);
}

function githubReadFile(repo, ref, relativePath, token) {
  const encodedPath = relativePath.split("/").map(encodeURIComponent).join("/");
  const encodedRef = encodeURIComponent(ref);
  const data = githubRequest("GET", `/repos/${repo}/contents/${encodedPath}?ref=${encodedRef}`, undefined, token);
  if (!data.content) return "";
  return Buffer.from(String(data.content).replace(/\s/g, ""), "base64").toString("utf8");
}

function githubFileSha(repo, ref, relativePath, token) {
  try {
    const encodedPath = relativePath.split("/").map(encodeURIComponent).join("/");
    const encodedRef = encodeURIComponent(ref);
    const data = githubRequest("GET", `/repos/${repo}/contents/${encodedPath}?ref=${encodedRef}`, undefined, token);
    return data.sha || "";
  } catch (error) {
    return "";
  }
}

function createStorage(options) {
  if (options.mode === "github") {
    if (!options.repo) throw new Error("GitHub storage requires --repo or PULSEBOARD_GITHUB_REPO.");
    const token = githubToken(options);
    return {
      kind: "github",
      repo: options.repo,
      ref: options.ref,
      readFile(relativePath) {
        return githubReadFile(options.repo, options.ref, relativePath, token);
      },
      listFiles(paths) {
        const all = githubTree(options.repo, options.ref, token);
        return all.filter((file) => paths.some((candidate) => file === candidate || file.startsWith(`${candidate}/`)));
      },
      url(relativePath) {
        return `https://github.com/${options.repo}/blob/${encodeURIComponent(options.ref)}/${relativePath}`;
      },
    };
  }
  return {
    kind: "local",
    root: options.root,
    readFile(relativePath) {
      return readLocalFile(options.root, relativePath);
    },
    listFiles(paths) {
      return paths.flatMap((candidate) => walkLocal(options.root, candidate));
    },
    url(relativePath) {
      return relativePath;
    },
  };
}

function loadConfig(storage, configPath) {
  return parseConfigMarkdown(storage.readFile(configPath));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourcePaths(config) {
  return unique([
    "project/info",
    "project/tasks",
    "project/log.md",
    "project/board.md",
    "commands",
    ...config.docs,
    ...config.knowledge_sources,
    ...config.activities,
  ]);
}

function titleFromText(file, text) {
  const heading = text.split("\n").find((line) => /^#\s+/.test(line));
  if (heading) return heading.replace(/^#\s+/, "").trim();
  return path.basename(file, path.extname(file));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length > 2);
}

function snippet(text, tokens) {
  const normalized = normalizeWhitespace(text);
  const lower = normalized.toLowerCase();
  const positions = tokens.map((token) => lower.indexOf(token)).filter((index) => index >= 0);
  const start = Math.max(0, positions.length ? Math.min(...positions) - 90 : 0);
  const value = normalized.slice(start, start + 360);
  return `${start > 0 ? "..." : ""}${value}${start + 360 < normalized.length ? "..." : ""}`;
}

function loadDocuments(options = {}) {
  const storage = createStorage({ ...parseArgs([]), ...options });
  const config = loadConfig(storage, options.config || DEFAULT_CONFIG);
  const files = storage.listFiles(sourcePaths(config))
    .filter((file) => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .filter((file) => !file.includes("/summaries/"))
    .sort((a, b) => a.localeCompare(b));
  const seen = new Set();
  const documents = [];
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    let text = "";
    try {
      text = storage.readFile(file);
    } catch (error) {
      continue;
    }
    documents.push({
      id: file,
      path: file,
      title: titleFromText(file, text),
      text,
      url: storage.url(file),
      metadata: { storage: storage.kind },
    });
  }
  return { config, documents, storage };
}

function searchPulseboard(query, options = {}) {
  const limit = Number(options.limit || 10);
  const tokens = tokenize(query);
  const { documents } = loadDocuments(options);
  if (!tokens.length) return { results: [] };
  const results = documents
    .map((document) => {
      const titleTokens = tokenize(document.title);
      const pathTokens = tokenize(document.path);
      const body = document.text.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (titleTokens.includes(token)) score += 6;
        if (pathTokens.includes(token)) score += 4;
        const matches = body.split(token).length - 1;
        score += Math.min(matches, 8);
      }
      return { document, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.document.path.localeCompare(b.document.path))
    .slice(0, limit)
    .map(({ document, score }) => ({
      id: document.id,
      title: document.title,
      url: document.url,
      path: document.path,
      score,
      text: snippet(document.text, tokens),
    }));
  return { results };
}

function fetchPulseboard(id, options = {}) {
  const { documents } = loadDocuments(options);
  const document = documents.find((item) => item.id === id || item.path === id);
  if (!document) throw new Error(`Document not found: ${id}`);
  return document;
}

function queryPulseboard(question, options = {}) {
  const search = searchPulseboard(question, { ...options, limit: options.limit || 6 });
  const evidence = search.results.map((result) => ({
    id: result.id,
    title: result.title,
    url: result.url,
    snippet: result.text,
  }));
  const answer = evidence.length
    ? `Found ${evidence.length} source-backed result(s). Use the evidence below to separate facts from product inference.`
    : "No matching source-backed evidence was found in the configured Pulseboard wiki.";
  return {
    answer,
    evidence,
    inference: evidence.length ? "Rank or prioritize only after reviewing the cited source text." : "",
    gaps: evidence.length ? [] : ["Ingest more customer calls, requests, specs, or maintained synthesis pages for this question."],
  };
}

function stripMarkdownExamples(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");
}

function wikilinks(text) {
  return [...stripMarkdownExamples(text).matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map((match) => match[1].trim());
}

function hasSourceReference(text) {
  return /raw\/(activities|info|meetings|requests|specs)\//.test(text)
    || /\[[^\]]+\]\([^)]+\)/.test(text)
    || /\[\[[^\]]+\]\]/.test(text);
}

function lintPulseboard(options = {}) {
  const { documents } = loadDocuments(options);
  const ids = new Set(documents.map((document) => document.path.replace(/\.md$/, "")));
  const brokenLinks = [];
  const evidenceGaps = [];
  const rawHygiene = [];
  for (const document of documents) {
    for (const link of wikilinks(document.text)) {
      if (!ids.has(link) && !ids.has(`project/${link}`) && !ids.has(`project/info/${link}`) && !ids.has(`project/tasks/${link}`)) {
        brokenLinks.push({ file: document.path, link });
      }
    }
    if (document.path.startsWith("project/info/")
      && !document.path.endsWith("/index.md")
      && !hasSourceReference(document.text)) {
      evidenceGaps.push({ file: document.path, issue: "Maintained info page has no source or wiki reference." });
    }
    if (document.path.startsWith("raw/") && /^#\s*(Summary|Synthesis|TL;DR)/im.test(document.text)) {
      rawHygiene.push({ file: document.path, issue: "Raw file looks like maintained synthesis rather than preserved source material." });
    }
  }
  const status = brokenLinks.length || evidenceGaps.length || rawHygiene.length ? "warnings" : "pass";
  return {
    status,
    broken_links: brokenLinks,
    evidence_gaps: evidenceGaps,
    raw_hygiene: rawHygiene,
    query_readiness: status === "pass"
      ? "Configured wiki sources are link-clean for the implemented lint checks."
      : "Fix warnings before relying on broad product inference.",
  };
}

const STATUS_LANES = {
  todo: "To Do",
  "in-progress": "In Progress",
  "in-review": "In Review",
  done: "Done",
};

function parseFrontmatter(text) {
  const match = String(text || "").match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};
  const values = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    values[key] = rawValue.replace(/^"|"$/g, "");
  }
  return values;
}

function listTasks(options = {}) {
  const { documents } = loadDocuments(options);
  const tasks = documents
    .filter((document) => document.path.startsWith("project/tasks/") && document.path.endsWith(".md"))
    .map((document) => {
      const frontmatter = parseFrontmatter(document.text);
      return {
        id: frontmatter.id || path.basename(document.path, ".md"),
        title: frontmatter.title || document.title,
        status: frontmatter.status || "",
        category: frontmatter.category || "",
        priority: frontmatter.priority || "",
        path: document.path,
        url: document.url,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return { tasks };
}

function boardPulseboard(options = {}) {
  const board = fetchPulseboard("project/board.md", options);
  const lanes = {};
  let currentLane = "";
  for (const line of board.text.split("\n")) {
    const laneMatch = line.match(/^##\s+(.+)\s*$/);
    if (laneMatch && STATUS_LANES[Object.keys(STATUS_LANES).find((status) => STATUS_LANES[status] === laneMatch[1])]) {
      currentLane = laneMatch[1];
      lanes[currentLane] = lanes[currentLane] || [];
      continue;
    }
    const cardMatch = line.match(/^- \[[ xX]\] \[\[([^\]]+)\]\]/);
    if (cardMatch && currentLane) lanes[currentLane].push(cardMatch[1]);
  }
  return { lanes };
}

function renderTask(input, taskId, date) {
  const title = input.title || input.request || taskId;
  const status = input.status || "todo";
  const category = input.category || "feature";
  const priority = input.priority || "p2";
  const areas = Array.isArray(input.areas) ? input.areas : [];
  const criteria = Array.isArray(input.acceptance_criteria) && input.acceptance_criteria.length
    ? input.acceptance_criteria
    : ["Clarify acceptance criteria before implementation."];
  return [
    "---",
    "type: task",
    `id: ${taskId}`,
    `title: ${JSON.stringify(title)}`,
    `status: ${status}`,
    `category: ${category}`,
    `priority: ${priority}`,
    `areas: [${areas.map((area) => JSON.stringify(area)).join(", ")}]`,
    `created: ${date}`,
    "---",
    "",
    `# ${title}`,
    "",
    "## Request",
    "",
    input.request || title,
    "",
    "## Scope",
    "",
    input.scope || "Define and deliver the requested work.",
    "",
    "## Affected Areas",
    "",
    areas.length ? areas.map((area) => `- ${area}`).join("\n") : "- Not classified yet.",
    "",
    "## Category And Priority",
    "",
    `- Category: ${category}`,
    `- Priority: ${priority}`,
    "",
    "## Acceptance Criteria",
    "",
    ...criteria.map((item) => `- [ ] ${item}`),
    "",
    "## Implementation Notes",
    "",
    input.notes || "- Add implementation notes as work progresses.",
    "",
    "## Evidence",
    "",
    input.evidence || "- Created from ChatGPT/Pulseboard task request.",
    "",
    "## Dependencies",
    "",
    input.dependencies || "- None identified.",
    "",
    "## Open Questions",
    "",
    input.open_questions || "- None yet.",
    "",
    "## Check Result",
    "",
    "- Pending.",
    "",
  ].join("\n");
}

function boardWithTask(boardText, taskId, status) {
  const lane = STATUS_LANES[status] || STATUS_LANES.todo;
  const card = `- [ ] [[${taskId}]]`;
  const lines = boardText.split("\n").filter((line) => !new RegExp(`^- \\[[ xX]\\] \\[\\[${taskId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]`).test(line));
  const output = [];
  let inserted = false;
  for (let index = 0; index < lines.length; index += 1) {
    output.push(lines[index]);
    if (lines[index] === `## ${lane}`) {
      output.push("");
      output.push(card);
      inserted = true;
      if (lines[index + 1] === "") index += 1;
    }
  }
  if (!inserted) {
    output.push("");
    output.push(`## ${lane}`);
    output.push("");
    output.push(card);
  }
  return output.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

function updateTaskStatusText(taskText, status, note) {
  let text = taskText;
  if (/^status:\s*.+$/m.test(text)) text = text.replace(/^status:\s*.+$/m, `status: ${status}`);
  else text = text.replace(/^---\n/, `---\nstatus: ${status}\n`);
  if (note) {
    text = `${text.trim()}\n\n## Update Notes\n\n- ${today()}: ${note}\n`;
  }
  return text.endsWith("\n") ? text : `${text}\n`;
}

function slug(value) {
  return String(value || "note")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "note";
}

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function rawDirectory(sourceType) {
  const mapping = {
    activity: "raw/activities",
    info: "raw/info",
    meeting: "raw/meetings",
    request: "raw/requests",
    spec: "raw/specs",
  };
  return mapping[sourceType] || mapping.info;
}

function githubCreatePullRequest(input, options = {}) {
  const repo = options.repo || process.env.PULSEBOARD_GITHUB_REPO;
  const base = options.ref || process.env.PULSEBOARD_GITHUB_REF || "main";
  const token = githubToken(options);
  if (!repo) throw new Error("GitHub write tools require PULSEBOARD_GITHUB_REPO or --repo.");
  if (!token) throw new Error("GitHub write tools require a GitHub App installation id or a GitHub token.");
  const branch = input.branch || `pulseboard/${slug(input.branch_topic || input.title || "change")}-${Date.now()}`;
  const baseRef = githubRequest("GET", `/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`, undefined, token);
  githubRequest("POST", `/repos/${repo}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha: baseRef.object.sha,
  }, token);
  for (const file of input.files) {
    const content = file.content.endsWith("\n") ? file.content : `${file.content}\n`;
    const body = {
      message: file.message || input.commit_message || input.title,
      content: Buffer.from(content).toString("base64"),
      branch,
    };
    const sha = githubFileSha(repo, branch, file.path, token);
    if (sha) body.sha = sha;
    const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
    githubRequest("PUT", `/repos/${repo}/contents/${encodedPath}`, body, token);
  }
  const pr = githubRequest("POST", `/repos/${repo}/pulls`, {
    title: input.title,
    head: branch,
    base,
    body: input.body || "Pulseboard change prepared by the ChatGPT MCP adapter.",
  }, token);
  return {
    branch,
    pull_request: pr.html_url,
    files: input.files.map((file) => file.path),
  };
}

function createGithubIngestPr(input, options = {}) {
  const sourceType = input.source_type || "info";
  const topic = slug(input.topic || "knowledge-note");
  const date = input.date || today();
  const rawPath = `${rawDirectory(sourceType)}/${date}-${topic}.md`;
  const files = [{
    path: rawPath,
    content: input.text || "",
    message: `injest: add ${sourceType} source ${topic}`,
  }];
  if (input.synthesis) {
    files.push({
      path: `project/info/${topic}.md`,
      content: input.synthesis,
      message: `docs: synthesize ${topic}`,
    });
  }
  return githubCreatePullRequest({
    branch: input.branch,
    branch_topic: `injest-${topic}`,
    title: input.title || `Injest ${sourceType}: ${input.topic || topic}`,
    body: input.body || "Source-backed Pulseboard knowledge ingestion prepared by the ChatGPT MCP adapter.",
    files,
  }, options);
}

function createTaskPr(input, options = {}) {
  const storage = createStorage({ ...parseArgs([]), ...options });
  const taskId = slug(input.id || input.title || input.request);
  const date = input.date || today();
  const status = input.status || "todo";
  const taskPath = `project/tasks/${taskId}.md`;
  const boardText = storage.readFile("project/board.md");
  const files = [
    {
      path: `raw/requests/${date}-${taskId}.md`,
      content: input.request || input.title || taskId,
      message: `injest: capture task request ${taskId}`,
    },
    {
      path: taskPath,
      content: renderTask(input, taskId, date),
      message: `task: add ${taskId}`,
    },
    {
      path: "project/board.md",
      content: boardWithTask(boardText, taskId, status),
      message: `board: add ${taskId}`,
    },
    {
      path: "project/log.md",
      content: `${storage.readFile("project/log.md").trim()}\n- ${date}: Added task [[${taskId}]] via ChatGPT MCP adapter.\n`,
      message: `log: add ${taskId}`,
    },
  ];
  return githubCreatePullRequest({
    branch: input.branch,
    branch_topic: `task-${taskId}`,
    title: input.pr_title || `Add task: ${input.title || taskId}`,
    body: input.pr_body || "Adds a Pulseboard task record, request source note, board card, and log entry.",
    files,
  }, options);
}

function updateTaskPr(input, options = {}) {
  const storage = createStorage({ ...parseArgs([]), ...options });
  const taskId = slug(input.id || input.task || "");
  const status = input.status;
  if (!taskId) throw new Error("update_task_pr requires id.");
  if (!STATUS_LANES[status]) throw new Error(`Invalid status: ${status}`);
  const taskPath = `project/tasks/${taskId}.md`;
  const taskText = storage.readFile(taskPath);
  const boardText = storage.readFile("project/board.md");
  const date = input.date || today();
  const files = [
    {
      path: taskPath,
      content: updateTaskStatusText(taskText, status, input.note || ""),
      message: `task: update ${taskId} to ${status}`,
    },
    {
      path: "project/board.md",
      content: boardWithTask(boardText, taskId, status),
      message: `board: move ${taskId} to ${status}`,
    },
    {
      path: "project/log.md",
      content: `${storage.readFile("project/log.md").trim()}\n- ${date}: Updated task [[${taskId}]] to ${status} via ChatGPT MCP adapter.\n`,
      message: `log: update ${taskId}`,
    },
  ];
  return githubCreatePullRequest({
    branch: input.branch,
    branch_topic: `update-${taskId}-${status}`,
    title: input.pr_title || `Update task ${taskId} to ${status}`,
    body: input.pr_body || "Updates a Pulseboard task record, board lane, and log entry.",
    files,
  }, options);
}

function checkPulseboard(options = {}) {
  const lint = lintPulseboard(options);
  const board = boardPulseboard(options);
  const tasks = listTasks(options).tasks;
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const boardCards = [];
  for (const [lane, cards] of Object.entries(board.lanes)) {
    for (const id of cards) boardCards.push({ lane, id });
  }
  const missingTasks = boardCards.filter((card) => !taskById.has(card.id));
  const missingCards = tasks.filter((task) => !boardCards.some((card) => card.id === task.id));
  const laneMismatches = boardCards
    .filter((card) => taskById.has(card.id))
    .filter((card) => STATUS_LANES[taskById.get(card.id).status] !== card.lane)
    .map((card) => ({ id: card.id, lane: card.lane, status: taskById.get(card.id).status }));
  return {
    status: missingTasks.length || missingCards.length || laneMismatches.length || lint.status !== "pass" ? "warnings" : "pass",
    tasks: tasks.length,
    board_cards: boardCards.length,
    missing_tasks: missingTasks,
    missing_cards: missingCards.map((task) => task.id),
    lane_mismatches: laneMismatches,
    lint,
  };
}

const tools = [
  {
    name: "list_tasks",
    description: "List Pulseboard task records with status, category, priority, and path.",
    annotations: { title: "List Tasks", readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_board",
    description: "Return Obsidian Kanban board lanes and task cards.",
    annotations: { title: "Get Board", readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "check",
    description: "Validate task-board coherence plus knowledge-base lint warnings.",
    annotations: { title: "Check Pulseboard", readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search",
    description: "Search the configured Pulseboard wiki and raw knowledge sources.",
    annotations: { title: "Search Pulseboard", readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch",
    description: "Fetch a Pulseboard document by id/path.",
    annotations: { title: "Fetch Document", readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "query",
    description: "Answer a question with source-backed Pulseboard evidence and gaps.",
    annotations: { title: "Query Pulseboard", readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string" },
        limit: { type: "number" },
      },
      required: ["question"],
    },
  },
  {
    name: "lint",
    description: "Check Pulseboard wiki hygiene, source references, and broken wikilinks.",
    annotations: { title: "Lint Pulseboard", readOnlyHint: true, openWorldHint: false },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_ingest_pr",
    description: "Create a GitHub branch and pull request that appends raw source material and optional synthesis.",
    annotations: { title: "Create Ingest PR", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        source_type: { type: "string", enum: ["activity", "info", "meeting", "request", "spec"] },
        topic: { type: "string" },
        text: { type: "string" },
        synthesis: { type: "string" },
        date: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        branch: { type: "string" },
      },
      required: ["topic", "text"],
    },
  },
  {
    name: "create_task_pr",
    description: "Create a GitHub pull request adding a Pulseboard task, raw request note, board card, and log entry.",
    annotations: { title: "Create Task PR", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        request: { type: "string" },
        scope: { type: "string" },
        status: { type: "string", enum: ["todo", "in-progress", "in-review", "done"] },
        category: { type: "string" },
        priority: { type: "string" },
        areas: { type: "array", items: { type: "string" } },
        acceptance_criteria: { type: "array", items: { type: "string" } },
        evidence: { type: "string" },
        notes: { type: "string" },
        branch: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task_pr",
    description: "Create a GitHub pull request updating a task status and moving its board card.",
    annotations: { title: "Update Task PR", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["todo", "in-progress", "in-review", "done"] },
        note: { type: "string" },
        branch: { type: "string" },
      },
      required: ["id", "status"],
    },
  },
];

function isWriteTool(name) {
  return ["create_ingest_pr", "create_task_pr", "update_task_pr"].includes(name);
}

function activeTools(options = {}) {
  return tools.filter((tool) => !isWriteTool(tool.name)
    || (options.enableWrites && (options.oauthIssuer || options.allowNoAuthWrites)));
}

function callTool(name, input = {}, options = {}) {
  if (isWriteTool(name) && !options.enableWrites) {
    throw new Error(`${name} is disabled. Set PULSEBOARD_ENABLE_WRITE_TOOLS=1 or pass --enable-writes to advertise and run write tools.`);
  }
  if (isWriteTool(name) && !options.oauthIssuer && !options.allowNoAuthWrites) {
    throw new Error(`${name} requires OAuth. Set PULSEBOARD_OAUTH_ISSUER or use PULSEBOARD_ALLOW_NOAUTH_WRITES=1 for local development.`);
  }
  if (isWriteTool(name) && options.oauthIssuer && !options.authenticated) {
    throw new Error(`${name} requires OAuth authentication.`);
  }
  if (name === "list_tasks") return listTasks(options);
  if (name === "get_board") return boardPulseboard(options);
  if (name === "check") return checkPulseboard(options);
  if (name === "search") return searchPulseboard(input.query, { ...options, limit: input.limit });
  if (name === "fetch") return fetchPulseboard(input.id, options);
  if (name === "query") return queryPulseboard(input.question, { ...options, limit: input.limit });
  if (name === "lint") return lintPulseboard(options);
  if (name === "create_ingest_pr") return createGithubIngestPr(input, options);
  if (name === "create_task_pr") return createTaskPr(input, options);
  if (name === "update_task_pr") return updateTaskPr(input, options);
  throw new Error(`Unknown tool: ${name}`);
}

function toolInputSchema(name) {
  if (name === "search") return {
    query: z.string().describe("Natural language or keyword search query."),
    limit: z.number().optional().describe("Maximum number of results."),
  };
  if (name === "fetch") return {
    id: z.string().describe("Pulseboard document id or path, for example project/info/knowledge-base.md."),
  };
  if (name === "query") return {
    question: z.string().describe("Question to answer from the Pulseboard wiki and raw evidence."),
    limit: z.number().optional().describe("Maximum number of cited evidence results."),
  };
  if (name === "create_ingest_pr") return {
    source_type: z.enum(["activity", "info", "meeting", "request", "spec"]).optional().describe("Kind of raw source material to append."),
    topic: z.string().describe("Short topic used for filenames and PR title."),
    text: z.string().describe("Original source material to preserve in raw/."),
    synthesis: z.string().optional().describe("Optional maintained synthesis page content for project/info/."),
    date: z.string().optional().describe("YYYY-MM-DD source date. Defaults to today."),
    title: z.string().optional().describe("Pull request title."),
    body: z.string().optional().describe("Pull request body."),
    branch: z.string().optional().describe("Optional branch name."),
  };
  if (name === "create_task_pr") return {
    id: z.string().optional().describe("Optional deterministic task id. Defaults from title/request."),
    title: z.string().describe("Task title."),
    request: z.string().optional().describe("Original natural-language request."),
    scope: z.string().optional().describe("Task scope."),
    status: z.enum(["todo", "in-progress", "in-review", "done"]).optional().describe("Initial task status."),
    category: z.string().optional().describe("Task category."),
    priority: z.string().optional().describe("Task priority."),
    areas: z.array(z.string()).optional().describe("Affected project areas."),
    acceptance_criteria: z.array(z.string()).optional().describe("Acceptance criteria checklist items."),
    evidence: z.string().optional().describe("Evidence links or source notes."),
    notes: z.string().optional().describe("Implementation notes."),
    branch: z.string().optional().describe("Optional branch name."),
  };
  if (name === "update_task_pr") return {
    id: z.string().describe("Task id without path or extension."),
    status: z.enum(["todo", "in-progress", "in-review", "done"]).describe("New task status."),
    note: z.string().optional().describe("Optional update note appended to the task."),
    branch: z.string().optional().describe("Optional branch name."),
  };
  return {};
}

function toolSecuritySchemes(tool, options = {}) {
  if (!isWriteTool(tool.name)) return [{ type: "noauth" }];
  if (options.oauthIssuer) return [{ type: "oauth2", scopes: ["pulseboard.write"] }];
  if (options.allowNoAuthWrites) return [{ type: "noauth" }];
  return [{ type: "oauth2", scopes: ["pulseboard.write"] }];
}

function authChallenge(options = {}) {
  const resource = (options.publicUrl || `http://${options.host}:${options.port}`).replace(/\/$/, "");
  return `Bearer resource_metadata="${resource}/.well-known/oauth-protected-resource", error="insufficient_scope", error_description="Pulseboard write tools require OAuth"`;
}

function mcpAuthRequired(options = {}) {
  return {
    content: [{
      type: "text",
      text: "Authentication required: Pulseboard write tools require OAuth.",
    }],
    _meta: {
      "mcp/www_authenticate": [authChallenge(options)],
    },
    isError: true,
  };
}

async function verifyOAuthRequest(request, options = {}) {
  if (!options.oauthIssuer) return { authenticated: false };
  const header = request.headers.authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  if (!match) return { authenticated: false };
  const issuer = options.oauthIssuer.replace(/\/$/, "");
  const jwksUrl = options.oauthJwksUrl || `${issuer}/.well-known/jwks.json`;
  const audience = options.oauthAudience || options.publicUrl || `http://${options.host}:${options.port}`;
  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  const result = await jwtVerify(match[1], jwks, { issuer, audience });
  return {
    authenticated: true,
    subject: result.payload.sub || "",
    scopes: String(result.payload.scope || "").split(/\s+/).filter(Boolean),
  };
}

function createMcpServer(options = {}) {
  const server = new McpServer({
    name: "pulseboard",
    version: "0.3.0",
  });
  for (const tool of activeTools(options)) {
    server.registerTool(tool.name, {
      title: tool.annotations && tool.annotations.title,
      description: tool.description,
      inputSchema: toolInputSchema(tool.name),
      annotations: tool.annotations,
      _meta: {
        securitySchemes: toolSecuritySchemes(tool, options),
      },
    }, async (input) => {
      if (isWriteTool(tool.name) && options.oauthIssuer && !options.authenticated) {
        return mcpAuthRequired(options);
      }
      return mcpContent(callTool(tool.name, input || {}, options));
    });
  }
  return server;
}

function mcpContent(value) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify(value, null, 2),
    }],
  };
}

function handleMcpMessage(message, options) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "pulseboard", version: "0.2.0" },
      },
    };
  }
  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools: activeTools(options) } };
  }
  if (message.method === "tools/call") {
    const params = message.params || {};
    try {
      return { jsonrpc: "2.0", id: message.id, result: mcpContent(callTool(params.name, params.arguments || {}, options)) };
    } catch (error) {
      return { jsonrpc: "2.0", id: message.id, error: { code: -32000, message: error.message } };
    }
  }
  if (message.id === undefined) return undefined;
  return { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Unknown method: ${message.method}` } };
}

function writeMcpMessage(message) {
  if (!message) return;
  const payload = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`);
}

function startStdio(options) {
  let buffer = Buffer.alloc(0);
  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = buffer.slice(0, headerEnd).toString("utf8");
      const match = header.match(/content-length:\s*(\d+)/i);
      if (!match) throw new Error("Missing Content-Length header.");
      const length = Number(match[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + length;
      if (buffer.length < messageEnd) return;
      const message = JSON.parse(buffer.slice(messageStart, messageEnd).toString("utf8"));
      buffer = buffer.slice(messageEnd);
      writeMcpMessage(handleMcpMessage(message, options));
    }
  });
}

function readRequestBody(request, callback) {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const text = Buffer.concat(chunks).toString("utf8");
    callback(text ? JSON.parse(text) : {});
  });
}

function githubTokenFromRequest(request) {
  const header = request.headers.authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function optionsForRequest(request, url, options = {}, auth = {}) {
  const headerRepo = request.headers["x-pulseboard-repo"] || "";
  const headerInstallationId = request.headers["x-github-installation-id"] || "";
  const queryRepo = url.searchParams.get("repo") || "";
  const queryInstallationId = url.searchParams.get("installation_id") || "";
  const install = auth.subject ? resolveInstall(auth.subject, options) : {};
  const repo = queryRepo || headerRepo || install.repo || options.repo || options.defaultRepo || "";
  const githubInstallationId = queryInstallationId || headerInstallationId || install.installation_id || options.githubInstallationId || "";
  if (!repo) return options;
  return { ...options, repo, githubInstallationId, mode: "github" };
}

function sendJson(response, status, value) {
  const text = JSON.stringify(value, null, 2);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(text);
}

async function handleSdkMcpRequest(request, response, body, options) {
  let auth = { authenticated: false };
  try {
    auth = await verifyOAuthRequest(request, options);
  } catch (error) {
    console.error(`OAuth verification failed: ${error.message}`);
    auth = { authenticated: false };
  }
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestOptions = optionsForRequest(request, url, options, auth);
  const server = createMcpServer({ ...requestOptions, ...auth });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(request, response, body);
  } finally {
    response.on("close", () => {
      transport.close();
      server.close();
    });
  }
}

function protectedResourceMetadata(options) {
  const resource = options.publicUrl || `http://${options.host}:${options.port}`;
  return {
    resource,
    authorization_servers: options.oauthIssuer ? [options.oauthIssuer] : [],
    scopes_supported: ["pulseboard.read", "pulseboard.write"],
    resource_documentation: `${resource.replace(/\/$/, "")}/docs`,
  };
}

function appMetadata(options) {
  return {
    name: "Pulseboard",
    description: "Source-backed markdown project wiki, task board, and knowledge base stored locally or in GitHub.",
    mcp_endpoint: `${(options.publicUrl || `http://${options.host}:${options.port}`).replace(/\/$/, "")}/mcp`,
    storage: options.mode,
    repo: options.repo || "",
    multi_tenant_repo_routing: Boolean(options.installsJson || options.installsPath || options.defaultRepo),
    onboarding_endpoint: `${(options.publicUrl || `http://${options.host}:${options.port}`).replace(/\/$/, "")}/onboarding`,
    write_tools_enabled: activeTools(options).some((tool) => isWriteTool(tool.name)),
    tools: activeTools(options).map((tool) => ({
      name: tool.name,
      description: tool.description,
      annotations: tool.annotations,
      securitySchemes: toolSecuritySchemes(tool, options),
    })),
  };
}

async function handleHttpRequest(request, response, options) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { ok: true });
  if (request.method === "GET" && url.pathname === "/tools") {
    const requestOptions = optionsForRequest(request, url, options);
    return sendJson(response, 200, { tools: activeTools(requestOptions), repo: requestOptions.repo || "" });
  }
  if (request.method === "GET" && url.pathname === "/manifest.json") return sendJson(response, 200, appMetadata(options));
  if (request.method === "GET" && url.pathname === "/docs") return sendJson(response, 200, appMetadata(options));
  if (request.method === "GET" && url.pathname === "/onboarding") return sendJson(response, 200, onboardingSchema());
  if (request.method === "POST" && url.pathname === "/onboarding") {
    return readRequestBody(request, async (body) => {
      try {
        const result = await setupPulseboardRepository(body, {
          githubToken: githubTokenFromRequest(request),
          installsPath: options.installsPath,
          installsJson: options.installsJson,
          subject: body.subject,
        });
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
    });
  }
  if (request.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
    return sendJson(response, 200, protectedResourceMetadata(options));
  }
  if (request.method === "POST" && url.pathname.startsWith("/tools/")) {
    return readRequestBody(request, (body) => {
      const name = decodeURIComponent(url.pathname.slice("/tools/".length));
      const requestOptions = optionsForRequest(request, url, options);
      try {
        sendJson(response, 200, callTool(name, body, requestOptions));
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
    });
  }
  if (request.method === "POST" && url.pathname === "/mcp") {
    return readRequestBody(request, (body) => {
      handleSdkMcpRequest(request, response, body, options).catch((error) => {
        console.error(`MCP request failed: ${error.message}`);
        if (!response.headersSent) {
          sendJson(response, 500, {
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      });
    });
  }
  if (request.method === "GET" && url.pathname === "/mcp") {
    response.writeHead(405, { allow: "POST", "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
    return undefined;
  }
  return sendJson(response, 404, { error: "Not found" });
}

function startHttp(options) {
  const server = http.createServer((request, response) => {
    handleHttpRequest(request, response, options).catch((error) => {
      console.error(`Pulseboard HTTP request failed: ${error.message}`);
      if (!response.headersSent) sendJson(response, 500, { error: "Internal server error" });
    });
  });
  server.on("error", (error) => {
    console.error(`Pulseboard MCP HTTP adapter failed: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(options.port, options.host, () => {
    console.error(`Pulseboard MCP HTTP adapter listening on http://${options.host}:${options.port}`);
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.transport === "http") startHttp(options);
  else startStdio(options);
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
  activeTools,
  callTool,
  boardPulseboard,
  checkPulseboard,
  createGithubIngestPr,
  createTaskPr,
  createStorage,
  fetchPulseboard,
  handleHttpRequest,
  lintPulseboard,
  listTasks,
  loadDocuments,
  optionsForRequest,
  parseArgs,
  parseConfigMarkdown,
  queryPulseboard,
  searchPulseboard,
  tools,
};
