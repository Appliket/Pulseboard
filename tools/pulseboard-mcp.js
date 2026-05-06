#!/usr/bin/env node
const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");

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
    "  GITHUB_TOKEN or GH_TOKEN   Required for private GitHub repos and PR writes.",
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

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function githubRequest(method, apiPath, body, token = githubToken()) {
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

function githubTree(repo, ref) {
  const encodedRef = encodeURIComponent(ref);
  const data = githubRequest("GET", `/repos/${repo}/git/trees/${encodedRef}?recursive=1`);
  return (data.tree || [])
    .filter((item) => item.type === "blob")
    .map((item) => item.path);
}

function githubReadFile(repo, ref, relativePath) {
  const encodedPath = relativePath.split("/").map(encodeURIComponent).join("/");
  const encodedRef = encodeURIComponent(ref);
  const data = githubRequest("GET", `/repos/${repo}/contents/${encodedPath}?ref=${encodedRef}`);
  if (!data.content) return "";
  return Buffer.from(String(data.content).replace(/\s/g, ""), "base64").toString("utf8");
}

function githubFileSha(repo, ref, relativePath) {
  try {
    const encodedPath = relativePath.split("/").map(encodeURIComponent).join("/");
    const encodedRef = encodeURIComponent(ref);
    const data = githubRequest("GET", `/repos/${repo}/contents/${encodedPath}?ref=${encodedRef}`);
    return data.sha || "";
  } catch (error) {
    return "";
  }
}

function createStorage(options) {
  if (options.mode === "github") {
    if (!options.repo) throw new Error("GitHub storage requires --repo or PULSEBOARD_GITHUB_REPO.");
    return {
      kind: "github",
      repo: options.repo,
      ref: options.ref,
      readFile(relativePath) {
        return githubReadFile(options.repo, options.ref, relativePath);
      },
      listFiles(paths) {
        const all = githubTree(options.repo, options.ref);
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
  const token = githubToken();
  if (!repo) throw new Error("GitHub write tools require PULSEBOARD_GITHUB_REPO or --repo.");
  if (!token) throw new Error("GitHub write tools require GITHUB_TOKEN or GH_TOKEN.");
  const branch = input.branch || `pulseboard/${slug(input.branch_topic || input.title || "change")}-${Date.now()}`;
  const baseRef = githubRequest("GET", `/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
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
    const sha = githubFileSha(repo, branch, file.path);
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
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_board",
    description: "Return Obsidian Kanban board lanes and task cards.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "check",
    description: "Validate task-board coherence plus knowledge-base lint warnings.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search",
    description: "Search the configured Pulseboard wiki and raw knowledge sources.",
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
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "query",
    description: "Answer a question with source-backed Pulseboard evidence and gaps.",
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
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_ingest_pr",
    description: "Create a GitHub branch and pull request that appends raw source material and optional synthesis.",
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

function callTool(name, input = {}, options = {}) {
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
    return { jsonrpc: "2.0", id: message.id, result: { tools } };
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

function sendJson(response, status, value) {
  const text = JSON.stringify(value, null, 2);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(text);
}

function startHttp(options) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { ok: true });
    if (request.method === "GET" && url.pathname === "/tools") return sendJson(response, 200, { tools });
    if (request.method === "POST" && url.pathname.startsWith("/tools/")) {
      return readRequestBody(request, (body) => {
        const name = decodeURIComponent(url.pathname.slice("/tools/".length));
        try {
          sendJson(response, 200, callTool(name, body, options));
        } catch (error) {
          sendJson(response, 400, { error: error.message });
        }
      });
    }
    if (request.method === "POST" && url.pathname === "/mcp") {
      return readRequestBody(request, (body) => {
        sendJson(response, 200, handleMcpMessage(body, options));
      });
    }
    return sendJson(response, 404, { error: "Not found" });
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
  callTool,
  boardPulseboard,
  checkPulseboard,
  createGithubIngestPr,
  createTaskPr,
  createStorage,
  fetchPulseboard,
  lintPulseboard,
  listTasks,
  loadDocuments,
  parseConfigMarkdown,
  queryPulseboard,
  searchPulseboard,
  tools,
};
