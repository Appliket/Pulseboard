const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  createGitHubAppJwt,
  onboardingSchema,
  parseInstallMappings,
  resolveInstall,
  resolveInstalledRepo,
  splitRepo,
  templateFiles,
} = require("../tools/pulseboard-onboarding");

const schema = onboardingSchema();
assert.ok(schema.fields.some((field) => field.name === "project"));
assert.ok(schema.fields.some((field) => field.name === "repo"));
assert.ok(schema.fields.find((field) => field.name === "owner").description.includes("installation_id"));

assert.deepEqual(parseInstallMappings('{"user-1":"acme/client-portal"}'), {
  "user-1": "acme/client-portal",
});
assert.throws(() => parseInstallMappings("[]"), /must be an object/);

assert.equal(resolveInstalledRepo("user-1", {
  installsJson: '{"user-1":"acme/client-portal"}',
}), "acme/client-portal");
assert.deepEqual(resolveInstall("user-2", {
  installsJson: '{"user-2":{"repo":"acme/app-board","installation_id":"123"}}',
}), {
  repo: "acme/app-board",
  installation_id: "123",
});
assert.equal(resolveInstalledRepo("missing", {
  installsJson: '{"default":"acme/default-board"}',
}), "acme/default-board");
assert.equal(resolveInstalledRepo("missing", {
  defaultRepo: "acme/fallback",
}), "acme/fallback");

assert.deepEqual(splitRepo("acme/client-portal"), {
  owner: "acme",
  name: "client-portal",
  fullName: "acme/client-portal",
});
assert.throws(() => splitRepo("not-a-slug"), /owner\/repo/);

const files = templateFiles({
  project: "Client Portal",
  repo: "acme/client-portal",
  timezone: "UTC",
});
const byPath = new Map(files.map((file) => [file.path, file.content]));
assert.match(byPath.get("README.md"), /^# Client Portal Pulseboard/);
assert.match(byPath.get("project/config.md"), /"github": "acme\/client-portal"/);
assert.ok(byPath.has("project/board.md"));
assert.ok(byPath.has("raw/requests/.gitkeep"));

const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwt = createGitHubAppJwt({
  githubAppId: "12345",
  githubAppPrivateKey: privateKey.export({ type: "pkcs1", format: "pem" }),
});
assert.equal(jwt.split(".").length, 3);

console.log("pulseboard onboarding tests passed");
