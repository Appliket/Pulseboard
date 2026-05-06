const { handleHttpRequest, parseArgs } = require("../tools/pulseboard-mcp");

module.exports = async function pulseboardHandler(request, response) {
  if (request.url === "/api" || request.url.startsWith("/api/")) {
    request.url = request.url.slice("/api".length) || "/";
  }
  const options = {
    ...parseArgs([]),
    transport: "http",
    host: request.headers.host || process.env.VERCEL_URL || "localhost",
    publicUrl: process.env.PULSEBOARD_PUBLIC_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""),
  };
  await handleHttpRequest(request, response, options);
};
