import "server-only";

import {
  err,
  escapeLike,
  foldSearch,
  isWatchState,
  ok,
  type Result,
  type WatchState,
} from "@/domain";
import { createClient } from "@/lib/supabase/server";

import { mapPostgrestError } from "./errors";
import { rowToRecord } from "./mapper";
import { TITLE_COLUMNS, type TitleInsert, type TitlePatch } from "./row";
import type { TitleFailure, TitleRecord } from "./types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface TmdbRef {
  kind: "movie" | "series";
  tmdbId: number;
}

export interface ListQuery {
  states: readonly WatchState[];
  /** Raw search text; folded and escaped here. */
  q: string;
}

/** Key of a (kind, tmdb_id) pair in the map `findIdsByTmdb` returns. */
export function tmdbKey(kind: string, tmdbId: number): string {
  return `${kind}:${tmdbId}`;
}

/**
 * The titles table behind typed results. It only knows rows and columns; who
 * may do what and which values are valid is decided by the use cases (and by
 * RLS plus the score-ownership trigger in the database).
 */
export function createTitlesRepository(client: SupabaseClient) {
  const titles = () => client.from("titles");

  /** Single-record query result -> record, mapping every error to a failure. */
  function toRecord(response: {
    data: unknown;
    error: { code?: string; message?: string } | null;
  }): Result<TitleRecord, TitleFailure> {
    if (response.error) return err(mapPostgrestError(response.error));
    return rowToRecord(response.data);
  }

  return {
    async insert(row: TitleInsert): Promise<Result<TitleRecord, TitleFailure>> {
      const response = await titles().insert(row).select(TITLE_COLUMNS).single();
      if (response.error?.code === "23505" && row.tmdb_id !== null) {
        // The pair already exists: tell the caller which row holds it.
        const existing = await titles()
          .select("id")
          .eq("kind", row.kind)
          .eq("tmdb_id", row.tmdb_id)
          .maybeSingle();
        const id = (existing.data as { id?: unknown } | null)?.id;
        return err({
          kind: "duplicate",
          existingId: typeof id === "string" ? id : null,
        });
      }
      return toRecord(response);
    },

    async findById(id: string): Promise<Result<TitleRecord, TitleFailure>> {
      return toRecord(
        await titles().select(TITLE_COLUMNS).eq("id", id).single(),
      );
    },

    async list(query: ListQuery): Promise<Result<TitleRecord[], TitleFailure>> {
      let builder = titles()
        .select(TITLE_COLUMNS)
        .in("state", [...query.states]);
      const folded = foldSearch(query.q.trim());
      if (folded !== "") {
        builder = builder.ilike("name_search", `%${escapeLike(folded)}%`);
      }
      const response = await builder.order("created_at", { ascending: false });
      if (response.error) return err(mapPostgrestError(response.error));

      const records: TitleRecord[] = [];
      for (const row of (response.data ?? []) as unknown[]) {
        const record = rowToRecord(row);
        // A row the domain rejects is never shown partially (TC-1).
        if (!record.ok) return record;
        records.push(record.value);
      }
      return ok(records);
    },

    async update(
      id: string,
      patch: TitlePatch,
    ): Promise<Result<TitleRecord, TitleFailure>> {
      return toRecord(
        await titles()
          .update(patch)
          .eq("id", id)
          .select(TITLE_COLUMNS)
          .single(),
      );
    },

    /** Deletes by id; resolves to the state the row had, for the redirect. */
    async remove(
      id: string,
    ): Promise<Result<{ state: WatchState }, TitleFailure>> {
      const response = await titles().delete().eq("id", id).select("state");
      if (response.error) return err(mapPostgrestError(response.error));
      const removed = (response.data ?? []) as { state?: unknown }[];
      if (removed.length === 0) return err({ kind: "not_found" });
      const state = removed[0]?.state;
      return isWatchState(state)
        ? ok({ state })
        : err({ kind: "unavailable" });
    },

    /** Ids of the stored titles matching the given TMDB pairs, by `tmdbKey`. */
    async findIdsByTmdb(
      refs: readonly TmdbRef[],
    ): Promise<Result<Map<string, string>, TitleFailure>> {
      const found = new Map<string, string>();
      if (refs.length === 0) return ok(found);

      const response = await titles()
        .select("id, kind, tmdb_id")
        .in("tmdb_id", [...new Set(refs.map((r) => r.tmdbId))]);
      if (response.error) return err(mapPostgrestError(response.error));

      const wanted = new Set(refs.map((r) => tmdbKey(r.kind, r.tmdbId)));
      for (const row of (response.data ?? []) as {
        id: string;
        kind: string;
        tmdb_id: number;
      }[]) {
        const key = tmdbKey(row.kind, row.tmdb_id);
        if (wanted.has(key)) found.set(key, row.id);
      }
      return ok(found);
    },
  };
}

export type TitlesRepository = ReturnType<typeof createTitlesRepository>;

/** Repository bound to the request's session client, so RLS applies. */
export async function getTitlesRepository(): Promise<TitlesRepository> {
  return createTitlesRepository(await createClient());
}
