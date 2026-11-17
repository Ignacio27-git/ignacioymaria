import { Client, type ClientConfig } from "pg";

/** Hosts the E2E machinery may talk to: this machine only, matched exactly. */
const LOCAL_HOSTS: readonly string[] = ["127.0.0.1", "localhost", "::1"];

/** Connection keys that can redirect `pg` to another host behind the URL's authority. */
const REDIRECT_KEYS: readonly string[] = ["host", "hostaddr"];

// Fixed texts on purpose: `new URL` errors and driver errors carry the full URL,
// password included, so nothing from them is ever forwarded.
const NOT_LOCAL =
  "Refusing to connect: the database host must be 127.0.0.1, localhost or [::1].";
const INVALID_URL = "Refusing to connect: the database URL is not valid.";

/**
 * Opens the one kind of connection the E2E machinery is allowed: a plain TCP
 * connection to a local Postgres. The check runs on the exact client that then
 * connects, so a difference between this parser and the driver's cannot open a
 * path to another host. The application under test is not covered by this guard.
 */
export async function openLocalDb(
  url: string,
  options: Pick<ClientConfig, "keepAlive" | "connectionTimeoutMillis"> = {},
): Promise<Client> {
  assertLocalUrl(url);
  const client = new Client({ connectionString: url, ...options });
  if (!LOCAL_HOSTS.includes(client.host)) throw new Error(NOT_LOCAL);
  await client.connect();
  return client;
}

function assertLocalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(INVALID_URL);
  }
  // An empty host would make `pg` fall back to PGHOST or a socket path.
  if (parsed.hostname === "") throw new Error(INVALID_URL);
  for (const key of parsed.searchParams.keys()) {
    if (REDIRECT_KEYS.includes(key.toLowerCase())) throw new Error(NOT_LOCAL);
  }
}
