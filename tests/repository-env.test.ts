import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const syntheticValue = "SYNTHETIC_PHASE_0_TEST_ONLY";

function runFixtureCheck(change: (root: string) => void = () => {}) {
  const fixture = mkdtempSync(join(tmpdir(), "phase-0-env-test-"));

  try {
    mkdirSync(join(fixture, "scripts"));
    for (const path of [".gitignore", ".env.example", "scripts/check-env.mjs"]) {
      copyFileSync(join(projectRoot, path), join(fixture, path));
    }
    const initialized = spawnSync("git", ["init", "--quiet"], {
      cwd: fixture,
      encoding: "utf8",
    });
    assert.ifError(initialized.error);
    assert.equal(initialized.status, 0);
    change(fixture);

    const result = spawnSync(process.execPath, [join(fixture, "scripts/check-env.mjs")], {
      cwd: fixture,
      encoding: "utf8",
    });
    assert.ifError(result.error);
    const output = `${result.stdout}${result.stderr}`;
    assert.ok(!output.includes(syntheticValue), "Checker must not echo supplied values");
    return { status: result.status, output };
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("the repository environment guard accepts the empty template and private-file rules", () => {
  const result = runFixtureCheck();
  assert.equal(result.status, 0);
  assert.match(result.output, /Environment checks passed/);
});

test("the repository environment guard rejects a filled template without printing its value", () => {
  const result = runFixtureCheck((root) => {
    const path = join(root, ".env.example");
    writeFileSync(path, readFileSync(path, "utf8").replace("RESEND_API_KEY=", `RESEND_API_KEY=${syntheticValue}`));
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /blank value/);
});

test("force-adding an ignored private environment file cannot bypass the guard", () => {
  const result = runFixtureCheck((root) => {
    writeFileSync(join(root, ".env"), `DATABASE_URL=${syntheticValue}\n`);
    const staged = spawnSync("git", ["add", "--force", ".env"], { cwd: root, encoding: "utf8" });
    assert.ifError(staged.error);
    assert.equal(staged.status, 0);
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /Private environment file visible to Git/);
});

test("adding an unexpected public variable is rejected", () => {
  const result = runFixtureCheck((root) => {
    const path = join(root, ".env.example");
    writeFileSync(path, `${readFileSync(path, "utf8")}NEXT_PUBLIC_DATABASE_URL=${syntheticValue}\n`);
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /Unexpected environment variable/);
});

test("removing private-file ignore rules is rejected", () => {
  const result = runFixtureCheck((root) => writeFileSync(join(root, ".gitignore"), ""));
  assert.equal(result.status, 1);
  assert.match(result.output, /Environment path is not ignored/);
});

test("duplicate template assignments are rejected", () => {
  const result = runFixtureCheck((root) => {
    const path = join(root, ".env.example");
    writeFileSync(path, `${readFileSync(path, "utf8")}RESEND_API_KEY=\n`);
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /Repeated environment variable/);
});

test("a missing required placeholder is rejected", () => {
  const result = runFixtureCheck((root) => {
    const path = join(root, ".env.example");
    writeFileSync(path, readFileSync(path, "utf8").replace(/^ENCRYPTION_KEY=.*\n?/m, ""));
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /Missing environment placeholder: ENCRYPTION_KEY/);
});
