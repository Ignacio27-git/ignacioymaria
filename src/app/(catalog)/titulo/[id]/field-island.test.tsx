import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";

import { err, ok, type Result } from "@/domain";
import { makeRecord } from "@/server/titles/test-helpers";
import type { TitleFailure, TitleView } from "@/server/titles/types";
import { expectNoAxeViolations } from "@/test/axe";

import { FieldIsland } from "./field-island";
import { useFieldSave } from "./use-field-save";

type SaveResult = Result<TitleView, TitleFailure>;

const VIEW: TitleView = { ...makeRecord(), average: null };
const SAVED: SaveResult = ok(VIEW);
const FAILED: SaveResult = err({ kind: "unavailable" });

function deferred() {
  let resolve: (value: SaveResult) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<SaveResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A number field with the confirmed value kept by the parent, like the editor does. */
function Harness({ save }: { save: (value: number) => Promise<SaveResult> }) {
  const [confirmed, setConfirmed] = useState(5);
  const field = useFieldSave({
    confirmed,
    save,
    onSaved: (_view, saved) => setConfirmed(saved),
  });
  return (
    <FieldIsland busy={field.busy} failed={field.failed} data-testid="island">
      <output aria-label="valor">{field.value}</output>
      <output aria-label="guardados">{field.savedCount}</output>
      {[6, 7, 8].map((n) => (
        <button key={n} type="button" onClick={() => field.commit(n)}>
          poner {n}
        </button>
      ))}
    </FieldIsland>
  );
}

function setup(save: (value: number) => Promise<SaveResult>) {
  return render(<Harness save={save} />);
}

const value = () => screen.getByLabelText("valor");
const press = (n: number) =>
  fireEvent.click(screen.getByRole("button", { name: `poner ${n}` }));

test("shows the new value at once and keeps it once the save is confirmed", async () => {
  const pending = deferred();
  const save = vi.fn(() => pending.promise);
  setup(save);

  press(7);

  expect(value()).toHaveTextContent("7");
  expect(save).toHaveBeenCalledWith(7);

  await act(async () => pending.resolve(SAVED));

  expect(value()).toHaveTextContent("7");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("is aria-busy only while a save is in flight", async () => {
  const pending = deferred();
  setup(() => pending.promise);
  const island = screen.getByTestId("island");
  expect(island).not.toHaveAttribute("aria-busy");

  press(7);
  expect(island).toHaveAttribute("aria-busy", "true");

  await act(async () => pending.resolve(SAVED));
  expect(island).not.toHaveAttribute("aria-busy");
});

test("a failed save rolls back to the last saved value and says so", async () => {
  const pending = deferred();
  setup(() => pending.promise);

  press(7);
  await act(async () => pending.resolve(FAILED));

  expect(value()).toHaveTextContent("5");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo guardar. Inténtalo de nuevo.",
  );
});

test("a save that throws counts as a failure", async () => {
  const pending = deferred();
  setup(() => pending.promise);

  press(7);
  await act(async () => pending.reject(new Error("network")));

  expect(value()).toHaveTextContent("5");
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

test("the next attempt clears the message", async () => {
  const first = deferred();
  const second = deferred();
  const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  setup(save);

  press(7);
  await act(async () => first.resolve(FAILED));
  expect(screen.getByRole("alert")).toBeInTheDocument();

  press(8);

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await act(async () => second.resolve(SAVED));
  expect(value()).toHaveTextContent("8");
});

test("rapid changes are serialized and only the latest queued one is sent", async () => {
  const first = deferred();
  const second = deferred();
  const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  setup(save);

  press(6);
  press(7);
  press(8);

  // One in flight; the intermediate 7 is superseded by 8.
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenLastCalledWith(6);
  expect(value()).toHaveTextContent("8");

  await act(async () => first.resolve(SAVED));

  expect(save).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenLastCalledWith(8);
  expect(value()).toHaveTextContent("8");

  await act(async () => second.resolve(SAVED));

  expect(value()).toHaveTextContent("8");
  expect(screen.getByTestId("island")).not.toHaveAttribute("aria-busy");
});

test("if the queued save fails the value goes back to the one that did save", async () => {
  const first = deferred();
  const second = deferred();
  const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  setup(save);

  press(6);
  press(8);
  await act(async () => first.resolve(SAVED));
  await act(async () => second.resolve(FAILED));

  expect(value()).toHaveTextContent("6");
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

test("if the first save fails the queued change is dropped", async () => {
  const first = deferred();
  const save = vi.fn().mockReturnValueOnce(first.promise);
  setup(save);

  press(6);
  press(8);
  await act(async () => first.resolve(FAILED));

  expect(save).toHaveBeenCalledTimes(1);
  expect(value()).toHaveTextContent("5");
});

test("counts confirmed saves only", async () => {
  const first = deferred();
  const second = deferred();
  const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  setup(save);

  press(6);
  await act(async () => first.resolve(SAVED));
  expect(screen.getByLabelText("guardados")).toHaveTextContent("1");

  press(7);
  await act(async () => second.resolve(FAILED));
  expect(screen.getByLabelText("guardados")).toHaveTextContent("1");
});

test("the message is axe clean", async () => {
  const pending = deferred();
  const { container } = setup(() => pending.promise);
  press(7);
  await act(async () => pending.resolve(FAILED));

  await expectNoAxeViolations(container);
});
