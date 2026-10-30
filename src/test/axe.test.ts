import { afterEach, describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "./axe";

function mount(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("expectNoAxeViolations", () => {
  it("passes for accessible markup", async () => {
    const container = mount(
      '<main><h1>Sistema</h1><label for="q">Buscar</label><input id="q" type="search" /></main>',
    );
    await expect(expectNoAxeViolations(container)).resolves.toBeUndefined();
  });

  it("fails and names the rule for an image without alternative text", async () => {
    const container = mount('<main><h1>Sistema</h1><img src="x.png" /></main>');
    await expect(expectNoAxeViolations(container)).rejects.toThrow(
      /image-alt/,
    );
  });

  it("fails for a form control without an accessible name", async () => {
    const container = mount('<main><h1>Sistema</h1><input type="text" /></main>');
    await expect(expectNoAxeViolations(container)).rejects.toThrow(/label/);
  });

  it("does not report color-contrast (unsupported in jsdom)", async () => {
    const container = mount(
      '<main><h1>Sistema</h1><p style="color:#fafafa;background:#ffffff">Texto</p></main>',
    );
    await expect(expectNoAxeViolations(container)).resolves.toBeUndefined();
  });
});
