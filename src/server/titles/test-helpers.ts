import { vi } from "vitest";

import { createTitle, type Title, type TitleInput } from "@/domain";

import type { TitlesRepository } from "./repository";
import type { TitleRecord } from "./types";

/** Every repository method as a mock; each test sets only what it needs. */
export function fakeRepository() {
  return {
    insert: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findIdsByTmdb: vi.fn(),
  } satisfies Record<keyof TitlesRepository, unknown>;
}

export const TITLE_ID = "11111111-1111-4111-8111-111111111111";

/** A stored record built through the domain constructor. */
export function makeRecord(
  input: Partial<TitleInput> & Record<string, unknown> = {},
  meta: { id?: string; createdAt?: string } = {},
): TitleRecord {
  const created = createTitle({ name: "Dune", kind: "movie", ...input });
  if (!created.ok) throw new Error("invalid test title");
  const title: Title = created.value;
  return {
    id: meta.id ?? TITLE_ID,
    createdAt: meta.createdAt ?? "2026-10-30T10:00:00.000Z",
    title,
  };
}
