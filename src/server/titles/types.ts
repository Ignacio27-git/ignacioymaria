import type { Result, Title } from "@/domain";

/** A stored title with the persistence metadata the server needs. */
export interface TitleRecord {
  readonly id: string;
  /** ISO timestamp the row was created. */
  readonly createdAt: string;
  readonly title: Title;
}

/**
 * What crosses the server boundary to the UI: the record plus the average,
 * already resolved so the UI never calls domain functions (D-53).
 */
export interface TitleView extends TitleRecord {
  readonly average: number | null;
}

export interface FieldIssue {
  readonly field: string;
  readonly code: string;
}

/** Expected failures of the titles use cases; nothing here is ever thrown (D-20). */
export type TitleFailure =
  | { kind: "unauthorized" }
  | { kind: "invalid_input"; errors: readonly FieldIssue[] }
  | { kind: "not_found" }
  /** `existingId` is the row already holding the (kind, tmdb_id) pair, when known. */
  | { kind: "duplicate"; existingId: string | null }
  | { kind: "forbidden" }
  | { kind: "unavailable" };

/** The failure branch of a `Result`, for actions that redirect on success. */
export type Failure<E> = Extract<Result<never, E>, { ok: false }>;

/** State returned by the manual-add form action (`useActionState`). */
export type ManualAddState = Failure<TitleFailure> | null;
