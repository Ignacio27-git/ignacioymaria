/**
 * Contract tests for the production deployment files (ROADMAP 2.2, D-89).
 * They read the files as text/JSON: they guard the safety properties that a
 * reviewer would otherwise have to remember (no PR trigger, secrets only in the
 * production environment, dry-run before the real push, CI stays secret-free).
 */
// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("vercel.json", () => {
  const config = JSON.parse(read("vercel.json")) as {
    git: { deploymentEnabled: Record<string, boolean> };
  };

  it("disables every branch except main", () => {
    expect(config.git.deploymentEnabled["**"]).toBe(false);
    expect(config.git.deploymentEnabled.main).toBe(true);
  });
});

describe("deploy-migrations workflow", () => {
  const workflow = read(".github/workflows/deploy-migrations.yml");

  it("never runs on pull requests", () => {
    expect(workflow).not.toMatch(/pull_request/);
  });

  it("uses the production environment and non-cancelling concurrency", () => {
    expect(workflow).toMatch(/environment:\s*production/);
    expect(workflow).toMatch(/cancel-in-progress:\s*false/);
  });

  it("runs the dry-run before the real push", () => {
    const dryRun = workflow.indexOf("db push --dry-run");
    const lines = workflow.split("\n");
    const realPush = lines.findIndex(
      (line) => /db push\s*$/.test(line.trim()) && !line.includes("--dry-run"),
    );
    expect(dryRun).toBeGreaterThan(-1);
    expect(realPush).toBeGreaterThan(-1);
    expect(workflow.slice(0, dryRun).split("\n").length - 1).toBeLessThan(
      realPush,
    );
  });

  it("pins the CLI through the lockfile", () => {
    expect(workflow).toMatch(/pnpm install --frozen-lockfile/);
    expect(workflow).toMatch(/pnpm exec supabase/);
  });

  it("never interpolates event data into the workflow", () => {
    expect(workflow).not.toMatch(/github\.event/);
  });
});

describe("ci.yml", () => {
  const ci = read(".github/workflows/ci.yml");

  it("stays free of production secrets and environment", () => {
    expect(ci).not.toMatch(/secrets\./);
    expect(ci).not.toMatch(/environment:/);
    expect(ci).not.toMatch(/production/i);
  });

  it("never runs the production smoke check", () => {
    expect(ci).not.toMatch(/test:prod/);
  });
});
