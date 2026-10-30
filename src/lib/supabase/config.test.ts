// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const root = process.cwd();
const config = readFileSync(join(root, "supabase/config.toml"), "utf8");

// Non-comment lines only, so commented-out examples never satisfy a check.
const active = config
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("#"))
  .join("\n");

describe("supabase/config.toml", () => {
  test("CA-2.7 enables the before_user_created hook on the migration function", () => {
    expect(active).toMatch(
      /\[auth\.hook\.before_user_created\]\s+enabled = true\s+uri = "pg-functions:\/\/postgres\/public\/before_user_created_hook"/,
    );
  });

  test("CA-7.3 keeps the default jwt_expiry", () => {
    expect(active).toMatch(/^jwt_expiry = 3600$/m);
  });

  test("A10 uses the same template for magic_link and confirmation", () => {
    expect(active).toMatch(
      /\[auth\.email\.template\.magic_link\]\s+subject = "[^"]+"\s+content_path = "\.\/supabase\/templates\/sign-in\.html"/,
    );
    expect(active).toMatch(
      /\[auth\.email\.template\.confirmation\]\s+subject = "[^"]+"\s+content_path = "\.\/supabase\/templates\/sign-in\.html"/,
    );
  });

  test("A11 allows redirects to /auth/confirm on the fixed site URL", () => {
    expect(active).toMatch(/^site_url = "http:\/\/127\.0\.0\.1:3000"$/m);
    expect(active).toMatch(
      /^additional_redirect_urls = \["http:\/\/127\.0\.0\.1:3000\/auth\/confirm"\]$/m,
    );
  });
});

describe("supabase/templates/sign-in.html", () => {
  const template = readFileSync(
    join(root, "supabase/templates/sign-in.html"),
    "utf8",
  );

  test("CA-4.5 links to /auth/confirm with token_hash and type=email", () => {
    expect(template).toContain(
      "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email",
    );
  });

  test("never links through the provider verify endpoint", () => {
    expect(template).not.toContain("{{ .ConfirmationURL }}");
  });
});
