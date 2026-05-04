#!/usr/bin/env node
const { run } = require("./agent-startup-summary");

const force = process.argv.includes("--force");
run({ force }).then((result) => {
  if (process.env.TRACKALO_STARTUP_VERBOSE === "1") {
    console.log(JSON.stringify(result));
  }
}).catch((error) => {
  console.error(`Trackalo startup summary failed: ${error.message}`);
  process.exitCode = 1;
});
