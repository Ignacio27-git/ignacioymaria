import { createLifecycle } from "../../scripts/e2e/run-lifecycle";
import { DB_URL } from "./db";
import { E2E_PEOPLE } from "./people";

/**
 * The one lifecycle of an E2E run. Playwright loads `global-setup.ts` and
 * `global-teardown.ts` in the same process, so both import this module and get
 * this same instance (checked against the real runner, see D-100).
 */
export const lifecycle = createLifecycle({ url: DB_URL, allowlist: E2E_PEOPLE });
