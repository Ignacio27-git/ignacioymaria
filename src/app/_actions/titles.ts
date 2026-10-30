"use server";

import { redirect } from "next/navigation";

import { todayIso, type Result, type WatchState } from "@/domain";
import { LIST_STATES } from "@/lib/titles/list-params";
import { searchAddCandidates, type AddCandidate } from "@/server/titles/add-candidates";
import { addTitle } from "@/server/titles/create";
import { deleteTitle } from "@/server/titles/delete";
import type {
  Failure,
  ManualAddState,
  TitleFailure,
  TitleView,
} from "@/server/titles/types";
import { updateTitleField, type FieldPatch } from "@/server/titles/update-field";
import { getTmdbDetails } from "@/server/tmdb/lookup";
import type { TmdbFailure, TmdbKind } from "@/server/tmdb/types";

/**
 * UI entries for the titles catalog; identity, validation and persistence live
 * in src/server/titles. Arguments come from the client, so the use cases
 * validate them (TC-10). Actions that redirect on success only ever return a
 * failure.
 */

/** Where the user came from: `vistas` adds an already watched title (A1). */
type AddOrigin = "vistas" | "pendientes";

function initialStateFor(desde: unknown) {
  return desde === "vistas"
    ? {
        state: "watched" satisfies WatchState,
        watchDate: { kind: "known", date: todayIso() },
      }
    : {};
}

export async function updateTitleFieldAction(
  id: string,
  patch: FieldPatch,
): Promise<Result<TitleView, TitleFailure>> {
  return updateTitleField(id, patch);
}

export async function searchAddCandidatesAction(
  query: string,
): Promise<Result<AddCandidate[], TmdbFailure>> {
  return searchAddCandidates(query);
}

/** Re-fetches the details on the server: the client never supplies the data. */
export async function addFromTmdbAction(
  kind: TmdbKind,
  tmdbId: number,
  desde?: AddOrigin,
): Promise<Failure<TitleFailure | TmdbFailure>> {
  const details = await getTmdbDetails(kind, tmdbId);
  if (!details.ok) return details;

  const { value } = details;
  const created = await addTitle({
    name: value.name,
    kind: value.kind,
    year: value.year,
    tmdbId: value.tmdbId,
    posterPath: value.posterPath,
    actors: value.actors,
    ...(value.kind === "series" ? { seasonsTotal: value.seasonsTotal } : {}),
    ...initialStateFor(desde),
  });
  if (!created.ok) return created;
  redirect(`/titulo/${created.value.id}`);
}

export async function addManualAction(
  _previous: ManualAddState,
  formData: FormData,
): Promise<NonNullable<ManualAddState>> {
  const created = await addTitle({
    name: formData.get("name") ?? undefined,
    kind: formData.get("kind") ?? undefined,
    ...initialStateFor(formData.get("desde")),
  });
  if (!created.ok) return created;
  redirect(`/titulo/${created.value.id}`);
}

export async function deleteTitleAction(
  id: string,
): Promise<Failure<TitleFailure>> {
  const deleted = await deleteTitle(id);
  if (deleted.ok) {
    const list = (LIST_STATES.vistas as readonly WatchState[]).includes(
      deleted.value.state,
    )
      ? "vistas"
      : "pendientes";
    redirect(`/${list}`);
  }
  // Already deleted by the other person: nothing left to do but leave.
  if (deleted.error.kind === "not_found") redirect("/vistas");
  return deleted;
}
