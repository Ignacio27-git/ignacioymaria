/** Reads and validates the public production URL used by the local smoke check. */
export function readProdBaseUrl(
  env: Record<string, string | undefined>,
): string {
  const raw = env.PROD_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "PROD_BASE_URL is not set. Put the public https URL of the deployment in .env.local.",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("PROD_BASE_URL is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("PROD_BASE_URL must use https.");
  }

  const host = url.hostname;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    throw new Error("PROD_BASE_URL must be the public URL, not a local host.");
  }

  return `${url.origin}`;
}
