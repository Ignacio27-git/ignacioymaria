import { expect, test } from "vitest";

import {
  DEFAULT_WATCH_STATE,
  isWatchState,
  WATCH_STATE_LABELS,
  WATCH_STATES,
} from "./watch-state";

test("defines exactly the six legend states", () => {
  expect(WATCH_STATES).toEqual([
    "urgent",
    "watched",
    "watched_rewatch",
    "watched_no_rewatch",
    "watched_awful",
    "pending",
  ]);
});

test("maps each id to its exact legend label", () => {
  expect(WATCH_STATE_LABELS).toEqual({
    urgent: "Urgente de ver",
    watched: "Vista",
    watched_rewatch: "Vista, repetir",
    watched_no_rewatch: "Vista, no repetir",
    watched_awful: "Vista y horrible",
    pending: "Pendiente",
  });
});

test.each(["Abandonada", "", "Vista", null, undefined, 3])(
  "isWatchState rejects %s",
  (v) => {
    expect(isWatchState(v)).toBe(false);
  },
);

test.each([...WATCH_STATES])("isWatchState accepts %s", (v) => {
  expect(isWatchState(v)).toBe(true);
});

test("defaults to pending", () => {
  expect(DEFAULT_WATCH_STATE).toBe("pending");
});
