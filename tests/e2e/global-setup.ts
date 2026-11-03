import { withDb } from "./db";

export const E2E_PEOPLE = [
  { email: "e2e-ignacio@example.test", person: "ignacio" },
  { email: "e2e-maria@example.test", person: "maria" },
] as const;

/** Allowlists the two E2E accounts. A seed file would break AC-1.2. */
export default async function globalSetup() {
  await withDb(async (client) => {
    for (const { email, person } of E2E_PEOPLE) {
      await client.query(
        "insert into public.allowed_emails (email, person) values ($1, $2) on conflict do nothing",
        [email, person],
      );
    }
  });
}
