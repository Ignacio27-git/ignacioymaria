// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { listTitles } from "./list";
import { getTitlesRepository } from "./repository";
import { fakeRepository, makeRecord } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));
vi.mock("./repository", () => ({ getTitlesRepository: vi.fn() }));

const repo = fakeRepository();

const VISTAS = ["watched", "watched_rewatch", "watched_no_rewatch", "watched_awful"];
const PENDIENTES = ["urgent", "pending"];

beforeEach(() => {
  vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  repo.list.mockResolvedValue({ ok: true, value: [] });
});

afterEach(() => {
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe("query (TC-8)", () => {
  test("S1: passes the selected states and q to the repository", async () => {
    await listTitles("vistas", { estado: "watched", q: " amelie " });

    expect(repo.list).toHaveBeenCalledWith({ states: ["watched"], q: "amelie" });
  });

  test("S2: a bogus state is dropped and the whole list is queried", async () => {
    await listTitles("vistas", { estado: "bogus" });

    expect(repo.list).toHaveBeenCalledWith({ states: VISTAS, q: "" });
  });

  test("a state of the other list is ignored", async () => {
    await listTitles("pendientes", { estado: "watched" });

    expect(repo.list).toHaveBeenCalledWith({ states: PENDIENTES, q: "" });
  });

  test("S3: 300 rows all come back", async () => {
    repo.list.mockResolvedValue({
      ok: true,
      value: Array.from({ length: 300 }, (_, i) =>
        makeRecord(
          { name: `Peli ${i}`, state: "watched" },
          { id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` },
        ),
      ),
    });

    const result = await listTitles("vistas", {});

    expect(result.ok && result.value).toHaveLength(300);
  });

  test("a repository failure is returned as is", async () => {
    repo.list.mockResolvedValue({ ok: false, error: { kind: "unavailable" } });

    expect(await listTitles("vistas", {})).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  test("without a person it answers unauthorized and touches nothing", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await listTitles("vistas", {})).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  });
});

describe("order (TC-9)", () => {
  const watched = (name: string, extra: Record<string, unknown>, id: string) =>
    makeRecord({ name, state: "watched", ...extra }, { id });

  test("Vistas: fecha sorts by watch date desc, unknown last", async () => {
    repo.list.mockResolvedValue({
      ok: true,
      value: [
        watched("B", {}, "00000000-0000-4000-8000-00000000000b"),
        watched("A", { watchDate: { kind: "known", date: "2026-01-01" } }, "00000000-0000-4000-8000-00000000000a"),
        watched("C", { watchDate: { kind: "known", date: "2026-06-01" } }, "00000000-0000-4000-8000-00000000000c"),
      ],
    });

    const result = await listTitles("vistas", {});

    expect(result.ok && result.value.map((v) => v.title.name)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  test("S1: nota sorts by average desc, unscored last, average in the DTO", async () => {
    repo.list.mockResolvedValue({
      ok: true,
      value: [
        watched("none", {}, "00000000-0000-4000-8000-000000000001"),
        watched("seven", { scores: { maria: 7 } }, "00000000-0000-4000-8000-000000000002"),
        watched("nine", { scores: { maria: 9 } }, "00000000-0000-4000-8000-000000000003"),
      ],
    });

    const result = await listTitles("vistas", { orden: "nota" });

    expect(result.ok && result.value.map((v) => [v.title.name, v.average])).toEqual([
      ["nine", 9],
      ["seven", 7],
      ["none", null],
    ]);
  });

  test("S2: Pendientes default puts urgent first even when older", async () => {
    repo.list.mockResolvedValue({
      ok: true,
      value: [
        makeRecord({ name: "new", state: "pending" }, { id: "00000000-0000-4000-8000-000000000001", createdAt: "2026-10-30T10:00:00Z" }),
        makeRecord({ name: "old urgent", state: "urgent" }, { id: "00000000-0000-4000-8000-000000000002", createdAt: "2026-01-01T10:00:00Z" }),
      ],
    });

    const result = await listTitles("pendientes", {});

    expect(result.ok && result.value.map((v) => v.title.name)).toEqual([
      "old urgent",
      "new",
    ]);
  });

  test("an unknown orden falls back to the list default", async () => {
    repo.list.mockResolvedValue({
      ok: true,
      value: [
        makeRecord({ name: "a", state: "pending" }, { id: "00000000-0000-4000-8000-000000000001" }),
        makeRecord({ name: "u", state: "urgent" }, { id: "00000000-0000-4000-8000-000000000002" }),
      ],
    });

    const result = await listTitles("pendientes", { orden: "zzz" });

    expect(result.ok && result.value[0]?.title.name).toBe("u");
  });
});
