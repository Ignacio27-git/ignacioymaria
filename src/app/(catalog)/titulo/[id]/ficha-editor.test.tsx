import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { err, ok } from "@/domain";
import type { TitleInput } from "@/domain";
import { makeRecord } from "@/server/titles/test-helpers";
import type { TitleView } from "@/server/titles/types";
import { expectNoAxeViolations } from "@/test/axe";

import { FichaEditor, type FichaEditorProps } from "./ficha-editor";

const actions = vi.hoisted(() => ({
  updateTitleFieldAction: vi.fn(),
  deleteTitleAction: vi.fn(),
}));

vi.mock("@/app/_actions/titles", () => actions);

const ID = "11111111-1111-4111-8111-111111111111";
const TODAY = "2026-10-31";

function view(
  input: Partial<TitleInput> & Record<string, unknown> = {},
  average: number | null = null,
): TitleView {
  return { ...makeRecord(input), average };
}

const BASE: FichaEditorProps = {
  id: ID,
  name: "Dune",
  me: "maria",
  today: TODAY,
  initial: {
    state: "watched",
    watchDate: { kind: "known", date: "2026-05-01" },
    observations: null,
    myScore: 7,
    average: 7,
  },
  otherScore: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.updateTitleFieldAction.mockResolvedValue(ok(view()));
  actions.deleteTitleAction.mockResolvedValue(undefined);
});

function setup(props: Partial<FichaEditorProps> = {}) {
  return render(<FichaEditor {...BASE} {...props} />);
}

async function click(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

test("shows both critics' scores and the average in equal columns", () => {
  setup({ initial: { ...BASE.initial, myScore: 8, average: 8 }, otherScore: null });

  expect(screen.getByText("María:", { exact: false })).toBeInTheDocument();
  expect(screen.getByText("Ignacio:", { exact: false })).toBeInTheDocument();
  // Ignacio never scored: no error, just "Sin nota".
  expect(screen.getByText("Sin nota", { selector: ".sr-only" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Media 8" })).toBeInTheDocument();
});

test("with no scores at all the average reads Sin media", () => {
  setup({ initial: { ...BASE.initial, myScore: null, average: null } });

  expect(screen.getByRole("img", { name: "Sin media" })).toBeInTheDocument();
});

test("only the signed-in person's own score has controls (María)", () => {
  setup({ me: "maria", otherScore: 6 });

  expect(screen.getAllByRole("group", { name: "Tu nota" })).toHaveLength(1);
  expect(screen.getByText("Ignacio:", { exact: false }).parentElement).toHaveTextContent("6");
});

test("Ignacio edits his own score and sees María's read-only", async () => {
  setup({ me: "ignacio", otherScore: 9, initial: { ...BASE.initial, myScore: 5, average: 7 } });

  expect(screen.getAllByRole("group", { name: "Tu nota" })).toHaveLength(1);
  expect(screen.getByText("María:", { exact: false }).parentElement).toHaveTextContent("9");

  await click("8");
  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "myScore",
    value: 8,
  });
});

test("the + button saves a quarter point more and the average comes from the server", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ scores: { maria: 7.25, ignacio: 6 } }, 6.63)),
  );
  setup({ otherScore: 6 });

  await click("Subir un cuarto de punto");

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "myScore",
    value: 7.25,
  });
  expect(screen.getByRole("img", { name: "Media 6,63" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Nota guardada: 7,25");
});

test("the old average stays, busy, until the action answers", async () => {
  let answer: (value: unknown) => void = () => {};
  actions.updateTitleFieldAction.mockImplementation(
    () => new Promise((resolve) => (answer = resolve)),
  );
  setup();

  await click("9");

  expect(screen.getByRole("img", { name: "Media 7" }).parentElement).toHaveAttribute(
    "aria-busy",
    "true",
  );

  await act(async () => answer(ok(view({ scores: { maria: 9 } }, 9))));

  expect(screen.getByRole("img", { name: "Media 9" })).toBeInTheDocument();
});

test("a failed score save rolls back, alerts and never announces a stamp", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(err({ kind: "unavailable" }));
  setup();

  await click("9");

  const region = screen.getByRole("group", { name: "Tu nota" }).parentElement as HTMLElement;
  expect(within(region).getByRole("alert")).toHaveTextContent(
    "No se pudo guardar. Inténtalo de nuevo.",
  );
  expect(screen.getByText("Tu nota: 7")).toBeInTheDocument();
  expect(screen.queryByText(/Nota guardada/)).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Media 7" })).toBeInTheDocument();
});

test("Quitar nota saves null", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(ok(view({}, null)));
  setup();

  await click("Quitar nota");

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "myScore",
    value: null,
  });
  expect(screen.getByRole("img", { name: "Sin media" })).toBeInTheDocument();
});

test("the state picker offers the six legend states and saves a pick", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ state: "watched_awful", watchDate: { kind: "known", date: "2026-05-01" } })),
  );
  setup();

  const radios = screen.getAllByRole("radio");
  expect(radios.map((radio) => radio.parentElement?.textContent)).toEqual([
    "Urgente de ver",
    "Vista",
    "Vista, repetir",
    "Vista, no repetir",
    "Vista y horrible",
    "Pendiente",
  ]);

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Vista y horrible" }));
  });

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "state",
    value: "watched_awful",
  });
  expect(screen.getByRole("radio", { name: "Vista y horrible" })).toBeChecked();
});

test("moving an unknown-date title to a watched state shows the date the server saved (A2)", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ state: "watched", watchDate: { kind: "known", date: TODAY } })),
  );
  setup({
    initial: { ...BASE.initial, state: "pending", watchDate: { kind: "unknown" } },
  });
  const date = screen.getByLabelText("Fecha de visionado");
  expect(date).toHaveValue("");

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Vista" }));
  });

  expect(date).toHaveValue(TODAY);
});

test("a failed state save restores the previous state", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(err({ kind: "unavailable" }));
  setup();

  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Vista y horrible" }));
  });

  expect(screen.getByRole("radio", { name: "Vista" })).toBeChecked();
  expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar");
});

test("the date uses a native picker and saves the chosen day", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ watchDate: { kind: "known", date: "2026-05-01" } })),
  );
  setup({ initial: { ...BASE.initial, watchDate: { kind: "unknown" } } });
  const input = screen.getByLabelText("Fecha de visionado");
  expect(input).toHaveAttribute("type", "date");

  await act(async () => {
    fireEvent.change(input, { target: { value: "2026-05-01" } });
  });

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "watchDate",
    value: { kind: "known", date: "2026-05-01" },
  });
  expect(screen.getByText("1 may 2026")).toBeInTheDocument();
});

test("Hoy fills in today for an unknown date", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ watchDate: { kind: "known", date: TODAY } })),
  );
  setup({ initial: { ...BASE.initial, watchDate: { kind: "unknown" } } });

  await click("Hoy");

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "watchDate",
    value: { kind: "known", date: TODAY },
  });
  expect(screen.getByLabelText("Fecha de visionado")).toHaveValue(TODAY);
});

test("No sé cuándo clears a known date and the display says so", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ watchDate: { kind: "unknown" } })),
  );
  setup();

  await click("No sé cuándo");

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "watchDate",
    value: { kind: "unknown" },
  });
  expect(screen.getByText("No sé cuándo", { selector: "p" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "No sé cuándo" })).toBeDisabled();
});

test("clearing the native picker also means unknown", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ watchDate: { kind: "unknown" } })),
  );
  setup();

  await act(async () => {
    fireEvent.change(screen.getByLabelText("Fecha de visionado"), {
      target: { value: "" },
    });
  });

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "watchDate",
    value: { kind: "unknown" },
  });
});

test("observations save on blur, once, keeping line breaks", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(
    ok(view({ observations: "Muy buena\nVolver a verla" })),
  );
  setup();
  const field = screen.getByRole("textbox", { name: "Observaciones" });

  fireEvent.change(field, { target: { value: "Muy" } });
  fireEvent.change(field, { target: { value: "Muy buena\nVolver a verla" } });
  expect(actions.updateTitleFieldAction).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.blur(field);
  });

  expect(actions.updateTitleFieldAction).toHaveBeenCalledTimes(1);
  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "observations",
    value: "Muy buena\nVolver a verla",
  });
  expect(field).toHaveValue("Muy buena\nVolver a verla");
});

test("cleared observations are stored as null", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(ok(view({ observations: null })));
  setup({ initial: { ...BASE.initial, observations: "Algo" } });
  const field = screen.getByRole("textbox", { name: "Observaciones" });
  expect(field).toHaveValue("Algo");

  fireEvent.change(field, { target: { value: "  " } });
  await act(async () => {
    fireEvent.blur(field);
  });

  expect(actions.updateTitleFieldAction).toHaveBeenCalledWith(ID, {
    field: "observations",
    value: null,
  });
});

test("blurring without changes saves nothing", async () => {
  setup({ initial: { ...BASE.initial, observations: "Algo" } });
  const field = screen.getByRole("textbox", { name: "Observaciones" });

  fireEvent.focus(field);
  await act(async () => {
    fireEvent.blur(field);
  });

  expect(actions.updateTitleFieldAction).not.toHaveBeenCalled();
});

test("a failed observations save puts the saved text back", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(err({ kind: "unavailable" }));
  setup({ initial: { ...BASE.initial, observations: "Antes" } });
  const field = screen.getByRole("textbox", { name: "Observaciones" });

  fireEvent.change(field, { target: { value: "Después" } });
  await act(async () => {
    fireEvent.blur(field);
  });

  expect(field).toHaveValue("Antes");
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

test("two fields edited in a row each save without overwriting the other", async () => {
  actions.updateTitleFieldAction.mockImplementation(
    async (_id: string, patch: { field: string; value: unknown }) =>
      patch.field === "state"
        ? ok(view({ state: "watched_rewatch" }))
        : ok(view({ observations: "Notas" })),
  );
  setup();
  const notes = screen.getByRole("textbox", { name: "Observaciones" });

  fireEvent.change(notes, { target: { value: "Notas" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("radio", { name: "Vista, repetir" }));
    fireEvent.blur(notes);
  });

  expect(actions.updateTitleFieldAction).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("radio", { name: "Vista, repetir" })).toBeChecked();
  expect(notes).toHaveValue("Notas");
});

test("Eliminar asks first and deletes nothing yet", async () => {
  setup();

  await click("Eliminar");

  const dialog = screen.getByRole("dialog", { name: "¿Eliminar «Dune»?" });
  expect(dialog).toHaveAttribute("open");
  expect(actions.deleteTitleAction).not.toHaveBeenCalled();
});

test("Cancelar and Escape keep the title", async () => {
  setup();
  await click("Eliminar");
  const dialog = screen.getByRole("dialog", { name: "¿Eliminar «Dune»?" });

  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  });
  expect(dialog).not.toHaveAttribute("open");

  await click("Eliminar");
  await act(async () => {
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
  });

  expect(dialog).not.toHaveAttribute("open");
  expect(actions.deleteTitleAction).not.toHaveBeenCalled();
});

test("confirming deletes by id", async () => {
  setup();
  await click("Eliminar");
  const dialog = screen.getByRole("dialog", { name: "¿Eliminar «Dune»?" });

  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
  });

  expect(actions.deleteTitleAction).toHaveBeenCalledWith(ID);
});

test("a failed delete closes the dialog and says so", async () => {
  actions.deleteTitleAction.mockResolvedValue(err({ kind: "unavailable" }));
  setup();
  await click("Eliminar");
  const dialog = screen.getByRole("dialog", { name: "¿Eliminar «Dune»?" });

  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
  });

  expect(dialog).not.toHaveAttribute("open");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo eliminar. Inténtalo de nuevo.",
  );
});

test("is axe clean", async () => {
  const { container } = setup({ otherScore: 6 });

  await expectNoAxeViolations(container);
});

test("is axe clean with a failed save showing", async () => {
  actions.updateTitleFieldAction.mockResolvedValue(err({ kind: "unavailable" }));
  const { container } = setup();
  await click("9");

  await expectNoAxeViolations(container);
});
