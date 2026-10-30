const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const CONFIRM_URL = /https?:\/\/[^"'\s<>]+\/auth\/confirm\?[^"'\s<>]+/;

type SearchResult = { messages: { ID: string }[] };
type Message = { HTML: string; Text: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${MAILPIT_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Mailpit ${path} answered ${response.status}`);
  }
  return (await response.json()) as T;
}

async function messageIds(to: string): Promise<string[]> {
  const result = await getJson<SearchResult>(
    `/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
  );
  return result.messages.map((message) => message.ID);
}

/** Remembers the mails already delivered to an address. */
export async function snapshotMailbox(to: string): Promise<Set<string>> {
  return new Set(await messageIds(to));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for a mail to `to` that is not in `known` and returns its link. */
export async function waitForMagicLink(
  to: string,
  known: Set<string>,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const fresh = (await messageIds(to)).find((id) => !known.has(id));
    if (fresh) {
      const message = await getJson<Message>(`/api/v1/message/${fresh}`);
      const match = CONFIRM_URL.exec(message.HTML || message.Text);
      if (!match) {
        throw new Error("The mail has no /auth/confirm link");
      }
      return match[0].replaceAll("&amp;", "&");
    }
    await sleep(250);
  }
  throw new Error(`No mail for ${to} within ${timeoutMs} ms`);
}

/** True when no new mail reaches `to` during the whole wait. */
export async function noNewMail(
  to: string,
  known: Set<string>,
  waitMs = 3_000,
): Promise<boolean> {
  await sleep(waitMs);
  return (await messageIds(to)).every((id) => known.has(id));
}
