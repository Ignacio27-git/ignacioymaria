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

/**
 * Backup workflow guards (ROADMAP 2.3, D-91). Every guard takes the workflow
 * text and throws on a violation, so the same functions can be run against the
 * real file and against deliberately unsafe inline variants.
 */
const stripComments = (text: string) =>
  text
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");

/** Collects the bodies of every `run:` step (single-line values and blocks). */
const runBodies = (text: string): string[] => {
  const lines = text.split("\n");
  const bodies: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    const [, indent, value] = match;
    if (!/^[|>][+-]?$/.test(value.trim())) {
      bodies.push(value);
      continue;
    }
    const block: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() !== "" && line.search(/\S/) <= indent.length) break;
      block.push(line);
    }
    bodies.push(block.join("\n"));
  }
  return bodies;
};

const ensure = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const linesOf = (text: string) => text.split("\n");

const guards = {
  triggers(text: string) {
    ensure(
      (text.match(/^\s*-\s*cron:/gm) ?? []).length === 1,
      "exactly one cron",
    );
    ensure(/workflow_dispatch/.test(text), "workflow_dispatch missing");
    ensure(!/pull_request/.test(text), "pull_request trigger");
    ensure(!/^\s*push:/m.test(text), "push trigger");
  },
  productionGated(text: string) {
    ensure(/environment:\s*production/.test(text), "environment production");
    for (const name of [
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_DB_PASSWORD",
      "SUPABASE_PROJECT_ID",
      "BACKUP_AGE_RECIPIENT",
    ]) {
      ensure(text.includes(`secrets.${name}`), `secret ${name} missing`);
    }
  },
  leastPrivilege(text: string) {
    ensure(/contents:\s*read/.test(text), "contents: read missing");
    ensure(!/:\s*write\b/.test(text), "write permission");
    ensure(!/id-token/.test(text), "id-token permission");
  },
  concurrency(text: string) {
    ensure(/group:\s*backup\b/.test(text), "concurrency group backup");
    ensure(/cancel-in-progress:\s*false/.test(text), "cancel-in-progress");
  },
  cliViaLockfile(text: string) {
    const install = text.indexOf("pnpm install --frozen-lockfile");
    ensure(install > -1, "frozen-lockfile install missing");
    const uses = [...text.matchAll(/pnpm exec supabase/g)];
    ensure(uses.length > 0, "pnpm exec supabase missing");
    for (const use of uses) ensure(install < use.index, "CLI before install");
    ensure(!/\bnpx\b/.test(text), "npx used");
    ensure(!/npm\s+(i|install)\s+-g/.test(text), "global install");
  },
  dumps(text: string) {
    ensure(/supabase link/.test(text), "supabase link missing");
    const dumps = linesOf(text).filter((line) => /db dump/.test(line));
    ensure(dumps.length === 3, "expected three db dump lines");
    ensure(
      dumps.every((line) => line.includes("--linked")),
      "dump without --linked",
    );
    ensure(
      dumps.filter((line) => line.includes("--role-only")).length === 1,
      "one roles dump",
    );
    const data = dumps.filter((line) => line.includes("--data-only"));
    ensure(data.length === 1, "one data dump");
    ensure(data[0].includes("--use-copy"), "data dump without --use-copy");
    ensure(
      dumps.filter(
        (line) =>
          !line.includes("--role-only") && !line.includes("--data-only"),
      ).length === 1,
      "one schema dump",
    );
    ensure(!/-s\s+auth\b/.test(text), "auth schema (-s)");
    ensure(!/--schema[ =]auth\b/.test(text), "auth schema (--schema)");
  },
  ageRecipientOnly(text: string) {
    ensure(text.includes('age -r "$BACKUP_AGE_RECIPIENT"'), "age -r missing");
    const ageLines = linesOf(text).filter((line) => /(^|\s)age\s+-/.test(line));
    for (const line of ageLines) {
      ensure(
        !/\s-[pdi]\b|--passphrase|--decrypt|--identity/.test(line),
        `unsafe age flag: ${line.trim()}`,
      );
    }
    ensure(!/AGE-SECRET-KEY/.test(text), "private identity referenced");
  },
  plaintextOrder(text: string) {
    const encrypt = text.indexOf("age -r");
    const remove = text.lastIndexOf('rm -rf "$PLAIN"');
    const upload = text.indexOf("actions/upload-artifact");
    ensure(encrypt > -1 && remove > -1 && upload > -1, "step missing");
    ensure(encrypt < remove, "plaintext removed before encryption");
    ensure(remove < upload, "upload before plaintext removal");
    ensure(/umask 077/.test(text), "umask 077 missing");
  },
  uploadHygiene(text: string) {
    const paths = linesOf(text).filter((line) => /^\s+path:/.test(line));
    ensure(paths.length > 0, "no upload path");
    for (const line of paths) {
      ensure(
        /^\s+path: \$\{\{ runner\.temp \}\}\/backup-out\/\*\.age$/.test(line),
        `unsafe upload path: ${line.trim()}`,
      );
    }
    ensure(!/path:\s*\|/.test(text), "multi-line upload path");
    ensure(/if-no-files-found:\s*error/.test(text), "if-no-files-found");
    ensure(/retention-days:\s*30\b/.test(text), "retention-days");
  },
  logHygiene(text: string) {
    ensure(!/set -x|xtrace|--debug/.test(text), "tracing enabled");
    ensure(!/\b(cat|tee|head|tail)\b/.test(text), "dump content printed");
    for (const line of linesOf(text)) {
      ensure(
        !/\b(echo|printf)\b.*(BACKUP_AGE_RECIPIENT|SUPABASE_|secrets\.)/.test(
          line,
        ),
        `secret echoed: ${line.trim()}`,
      );
      if (line.includes("secrets.")) {
        ensure(
          /^\s+[A-Z_]+:\s*\$\{\{\s*secrets\.[A-Z_]+\s*\}\}\s*$/.test(line),
          `secret outside env mapping: ${line.trim()}`,
        );
      }
    }
  },
  noInjection(text: string) {
    for (const body of runBodies(text)) {
      ensure(!body.includes("${{"), "expression inside run body");
    }
    ensure(!/github\.event/.test(text), "github.event used");
    ensure(!/github\.head_ref/.test(text), "github.head_ref used");
  },
  pinning(text: string) {
    const uses = linesOf(text).filter((line) => /\buses:/.test(line));
    ensure(uses.length > 0, "no actions used");
    for (const line of uses) {
      ensure(
        /uses:\s*[\w.-]+\/[\w.-]+@v\d+\s*$/.test(line),
        `unpinned action: ${line.trim()}`,
      );
    }
  },
  ageInstall(text: string) {
    ensure(/AGE_VERSION:\s*v1\.2\.1/.test(text), "age version pin");
    ensure(/AGE_SHA256:\s*[0-9a-f]{64}\b/.test(text), "age sha256 pin");
    const verify = text.indexOf("sha256sum -c -");
    const extract = text.indexOf("tar ");
    ensure(verify > -1 && extract > -1, "verify or extract missing");
    ensure(verify < extract, "extract before checksum verification");
    ensure(!/(curl|wget)[^\n]*\|\s*(ba)?sh/.test(text), "pipe to shell");
  },
  failFast(text: string) {
    ensure(!/\|\|\s*(true|:)/.test(text), "failure swallowed");
    ensure(!/continue-on-error/.test(text), "continue-on-error");
    ensure(/set -euo pipefail/.test(text), "set -euo pipefail missing");
  },
};

describe("backup workflow", () => {
  const text = stripComments(read(".github/workflows/backup.yml"));

  it("runs weekly and on demand only", () => {
    expect(() => guards.triggers(text)).not.toThrow();
  });

  it("is gated by the production environment and its secrets", () => {
    expect(() => guards.productionGated(text)).not.toThrow();
  });

  it("holds read-only permissions", () => {
    expect(() => guards.leastPrivilege(text)).not.toThrow();
  });

  it("queues runs without cancelling a running backup", () => {
    expect(() => guards.concurrency(text)).not.toThrow();
  });

  it("uses the CLI pinned by the lockfile", () => {
    expect(() => guards.cliViaLockfile(text)).not.toThrow();
  });

  it("dumps roles, schema and data without the auth schema", () => {
    expect(() => guards.dumps(text)).not.toThrow();
  });

  it("encrypts only to the public recipient", () => {
    expect(() => guards.ageRecipientOnly(text)).not.toThrow();
  });

  it("removes the plaintext between encryption and upload", () => {
    expect(() => guards.plaintextOrder(text)).not.toThrow();
  });

  it("uploads only encrypted files", () => {
    expect(() => guards.uploadHygiene(text)).not.toThrow();
  });

  it("keeps secrets and dump content out of the logs", () => {
    expect(() => guards.logHygiene(text)).not.toThrow();
  });

  it("never interpolates expressions into scripts", () => {
    expect(() => guards.noInjection(text)).not.toThrow();
  });

  it("pins every action to a major version", () => {
    expect(() => guards.pinning(text)).not.toThrow();
  });

  it("installs age from a checksum-verified release", () => {
    expect(() => guards.ageInstall(text)).not.toThrow();
  });

  it("fails the job when a dump or encryption fails", () => {
    expect(() => guards.failFast(text)).not.toThrow();
  });

  it("fails fast on a missing or malformed recipient", () => {
    expect(text).toMatch(/Backup recipient secret missing or malformed/);
  });
});

describe("backup guards reject unsafe variants", () => {
  it("rejects a directory upload path", () => {
    expect(() =>
      guards.uploadHygiene(
        "  path: dumps/\n  if-no-files-found: error\n  retention-days: 30",
      ),
    ).toThrow();
  });

  it("rejects a plaintext glob upload path", () => {
    expect(() =>
      guards.uploadHygiene(
        "  path: ${{ runner.temp }}/backup-out/*.sql\n  if-no-files-found: error\n  retention-days: 30",
      ),
    ).toThrow();
  });

  it("rejects echoing the recipient secret", () => {
    expect(() => guards.logHygiene('echo "$BACKUP_AGE_RECIPIENT"')).toThrow();
  });

  it("rejects shell tracing", () => {
    expect(() => guards.logHygiene("set -x")).toThrow();
  });

  it("rejects swallowed failures", () => {
    expect(() =>
      guards.failFast("set -euo pipefail\nsupabase db dump || true"),
    ).toThrow();
  });
});

describe("deploy docs", () => {
  const docs = read("docs/DEPLOY.md");

  it("contains placeholders only, never real keys or connection strings", () => {
    expect(docs).not.toMatch(/age1[0-9a-z]{58}/);
    expect(docs).not.toMatch(/AGE-SECRET-KEY/);
    expect(docs).not.toMatch(/postgres(ql)?:\/\/[^<]/);
  });

  it("documents the 60-day scheduled workflow pause", () => {
    expect(docs).toMatch(/60 días/);
  });

  it("warns that the import is never re-run after the cutover", () => {
    expect(docs).toMatch(/nunca[^\n]*(re-?ejecut|volver a ejecutar)/i);
  });

  it("documents decryption and the restore session setting", () => {
    expect(docs).toMatch(/age -d -i/);
    expect(docs).toMatch(/session_replication_role/);
  });

  it("requires the database tests after a restore", () => {
    expect(docs).toMatch(/pnpm test:db/);
  });

  it("warns about key loss and requires two offline copies", () => {
    expect(docs).toMatch(/dos copias/);
    expect(docs).toMatch(/irrecuperabl/i);
  });
});
