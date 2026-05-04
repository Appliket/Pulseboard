const assert = require("node:assert/strict");
const {
  previousWorkingDay,
  renderPostText,
  renderSummary,
} = require("../tools/daily-summary");

assert.equal(previousWorkingDay(new Date(2026, 4, 4)), "2026-05-01");
assert.equal(previousWorkingDay(new Date(2026, 4, 5)), "2026-05-04");
assert.equal(previousWorkingDay(new Date(2026, 4, 3)), "2026-05-01");

const summary = {
  targetDate: "2026-05-01",
  generatedAt: "2026-05-04T07:00:00.000Z",
  repositories: [
    {
      name: "example",
      commits: [
        {
          subject: "Add digest plugin",
          shortHash: "abc1234",
          author: "Ada",
          files: ["tools/daily-summary.js"],
        },
      ],
    },
  ],
  docs: [{ path: "project/config.md" }],
  notes: [{ path: "raw/activities/2026-05-01-note.md", text: "# Customer call\nDiscussed digest scope." }],
};

assert.match(renderSummary(summary), /Add digest plugin/);
assert.match(renderSummary(summary), /Customer call/);
assert.match(renderPostText(summary), /1 commit\(s\), 2 doc\/activity update\(s\)/);

console.log("daily summary tests passed");
