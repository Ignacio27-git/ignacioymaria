import { test as base, type Page } from "@playwright/test";

/**
 * Runtime guard for the production check: every non-GET request is aborted and
 * recorded, unless it is sent inside `allowServerActions`. In this app writes and
 * sign-out are server actions (POST), so the guard covers all of them. A test
 * fails afterwards if anything was blocked.
 */
const allowed = new WeakMap<Page, number>();

export async function allowServerActions<T>(
  page: Page,
  action: () => Promise<T>,
): Promise<T> {
  allowed.set(page, (allowed.get(page) ?? 0) + 1);
  try {
    return await action();
  } finally {
    allowed.set(page, (allowed.get(page) ?? 1) - 1);
  }
}

export const test = base.extend<{ readOnly: string[] }>({
  readOnly: [
    async ({ page }, use) => {
      const violations: string[] = [];
      await page.route("**/*", async (route) => {
        const request = route.request();
        const method = request.method();
        const safe =
          method === "GET" || method === "HEAD" || method === "OPTIONS";
        if (safe || (allowed.get(page) ?? 0) > 0) {
          await route.continue();
          return;
        }
        violations.push(`${method} ${new URL(request.url()).pathname}`);
        await route.abort();
      });
      await use(violations);
      if (violations.length > 0) {
        throw new Error(
          `Read-only guard blocked write requests: ${violations.join(", ")}`,
        );
      }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
