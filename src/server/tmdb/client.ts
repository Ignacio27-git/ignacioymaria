import "server-only";

import { err, ok, type Result } from "@/domain/result";

import { mapDetails, mapSearchResults } from "./mappers";
import type { TmdbCandidate, TmdbDetails, TmdbFailure, TmdbKind } from "./types";

const BASE_URL = "https://api.themoviedb.org/3";
const LANGUAGE = "es-ES";

/** Fetch Data Cache lifetimes, in seconds (D-38). */
const SEARCH_REVALIDATE = 3600;
const DETAILS_REVALIDATE = 604800;

const DEFAULT_TIMEOUT_MS = 5000;
/** One retry only, and never a wait longer than this (D-41). */
const MAX_RETRY_WAIT_MS = 1000;
const MAX_ATTEMPTS = 2;

type FetchImpl = (
  input: string,
  init: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

type TmdbClientOptions = {
  token: string;
  /** Tests inject a stub; the default reaches Next's patched fetch lazily. */
  fetchImpl?: FetchImpl;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
};

export type TmdbClient = {
  search(query: string): Promise<Result<TmdbCandidate[], TmdbFailure>>;
  details(kind: TmdbKind, id: number): Promise<Result<TmdbDetails, TmdbFailure>>;
};

const defaultFetch: FetchImpl = (input, init) => fetch(input, init);
const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const unavailable = err<TmdbFailure>({ kind: "unavailable" });
const notFound = err<TmdbFailure>({ kind: "not_found" });

/** Logs a short code only: never the response text, the URL or the token. */
function logFailure(code: string): void {
  console.error("tmdb request failed", code);
}

function retryDelayMs(response: Response): number {
  const header = response.headers.get("retry-after");
  const seconds = header === null ? NaN : Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return MAX_RETRY_WAIT_MS;
  return Math.min(seconds * 1000, MAX_RETRY_WAIT_MS);
}

export function createTmdbClient(options: TmdbClientOptions): TmdbClient {
  const {
    token,
    fetchImpl = defaultFetch,
    sleep = defaultSleep,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  async function attempt(
    url: string,
    revalidate: number,
  ): Promise<Response | "network"> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        next: { revalidate },
        signal: controller.signal,
      });
    } catch {
      return "network";
    } finally {
      clearTimeout(timer);
    }
  }

  /** Resolves to the parsed JSON body or a typed failure; never throws. */
  async function request(
    url: string,
    revalidate: number,
  ): Promise<Result<unknown, TmdbFailure>> {
    for (let n = 1; n <= MAX_ATTEMPTS; n++) {
      const response = await attempt(url, revalidate);
      if (response === "network") {
        logFailure("network");
        return unavailable;
      }
      if (response.status === 429) {
        if (n < MAX_ATTEMPTS) {
          await sleep(retryDelayMs(response));
          continue;
        }
        logFailure("rate_limited");
        return unavailable;
      }
      if (response.status === 404) return notFound;
      if (response.status === 401) {
        logFailure("auth");
        return unavailable;
      }
      if (!response.ok) {
        logFailure(`status_${response.status}`);
        return unavailable;
      }
      try {
        return ok(await response.json());
      } catch {
        logFailure("bad_json");
        return unavailable;
      }
    }
    return unavailable;
  }

  return {
    async search(query) {
      const params = new URLSearchParams({
        query,
        language: LANGUAGE,
        include_adult: "false",
        page: "1",
      });
      const body = await request(
        `${BASE_URL}/search/multi?${params}`,
        SEARCH_REVALIDATE,
      );
      if (!body.ok) return body;
      const candidates = mapSearchResults(body.value);
      return candidates.length > 0 ? ok(candidates) : notFound;
    },

    async details(kind, id) {
      const params = new URLSearchParams({
        append_to_response: "credits",
        language: LANGUAGE,
      });
      const path = kind === "movie" ? "movie" : "tv";
      const body = await request(
        `${BASE_URL}/${path}/${id}?${params}`,
        DETAILS_REVALIDATE,
      );
      if (!body.ok) return body;
      const details = mapDetails(kind, body.value);
      if (details === null) {
        logFailure("bad_payload");
        return unavailable;
      }
      return ok(details);
    },
  };
}
