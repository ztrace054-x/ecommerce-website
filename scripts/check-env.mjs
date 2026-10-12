import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const expectedNames = new Set([
  "DATABASE_URL",
  "MIGRATION_DATABASE_URL",
  "TEST_DATABASE_URL",
  "POSTGRES_PASSWORD",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "ADMIN_SECRET",
  "ENCRYPTION_KEY",
]);
const failures = [];

function git(args, input) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    input,
  });

  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw new Error("Cannot check environment safety: Git command failed.");
  }

  return result;
}

try {
  const files = git([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ]);

  if (files.status !== 0) {
    throw new Error("Cannot check environment safety outside a Git checkout.");
  }

  for (const path of files.stdout.split("\0").filter(Boolean)) {
    if (basename(path).startsWith(".env") && path !== ".env.example") {
      failures.push(`Private environment file visible to Git: ${path}`);
    }
  }

  const seen = new Set();
  const lines = readFileSync(join(root, ".env.example"), "utf8").split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      failures.push(`Invalid environment placeholder syntax on line ${index + 1}.`);
      continue;
    }

    const [, name, value] = match;
    if (!expectedNames.has(name)) {
      failures.push(`Unexpected environment variable on line ${index + 1}.`);
    }
    if (seen.has(name)) {
      failures.push(`Repeated environment variable on line ${index + 1}.`);
    }
    if (value !== "") {
      failures.push(`Environment template must have a blank value on line ${index + 1}.`);
    }
    seen.add(name);
  }

  for (const name of expectedNames) {
    if (!seen.has(name)) failures.push(`Missing environment placeholder: ${name}`);
  }

  const privatePaths = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
    "src/.env.local",
  ];
  const ignored = git(["check-ignore", "--no-index", "--stdin"], privatePaths.join("\n") + "\n");
  const ignoredPaths = new Set(ignored.stdout.trim().split(/\r?\n/));
  for (const path of privatePaths) {
    if (!ignoredPaths.has(path)) failures.push(`Environment path is not ignored: ${path}`);
  }

  const template = git(["check-ignore", "--no-index", "--", ".env.example"]);
  if (template.status === 0) failures.push("The root .env.example must not be ignored.");
} catch {
  failures.push("Environment checks could not complete. Check Git and .env.example.");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log("Environment checks passed: blank template, private files ignored, no Git-visible private environment files.");
}
