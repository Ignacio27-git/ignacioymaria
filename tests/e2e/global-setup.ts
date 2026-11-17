import { lifecycle } from "./lifecycle";

export { E2E_PEOPLE } from "./people";

/**
 * Takes the run lock, allowlists the two E2E accounts and snapshots the local
 * titles. A seed file would break AC-1.2. `global-teardown.ts` gives the data back.
 */
export default async function globalSetup() {
  await lifecycle.begin();
}
