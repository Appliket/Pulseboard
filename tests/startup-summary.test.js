const assert = require("node:assert/strict");
const { isMorning } = require("../tools/codex-startup-summary");

assert.equal(isMorning(new Date(2026, 4, 4, 5), {}), false);
assert.equal(isMorning(new Date(2026, 4, 4, 6), {}), true);
assert.equal(isMorning(new Date(2026, 4, 4, 11), {}), true);
assert.equal(isMorning(new Date(2026, 4, 4, 12), {}), false);
assert.equal(isMorning(new Date(2026, 4, 4, 8), { morning_window: { start_hour: 9, end_hour: 10 } }), false);
assert.equal(isMorning(new Date(2026, 4, 4, 9), { morning_window: { start_hour: 9, end_hour: 10 } }), true);

console.log("startup summary tests passed");
