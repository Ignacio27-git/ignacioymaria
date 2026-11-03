import axe from "axe-core";

// color-contrast is disabled: jsdom has no layout/paint, so axe cannot compute
// it. Contrast is covered by the token AA tests (src/lib/design).
export async function expectNoAxeViolations(
  container: Element,
): Promise<void> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  if (results.violations.length === 0) return;

  const summary = results.violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => node.target.join(" "))
        .join(", ");
      return `${violation.id}: ${violation.help} (${targets})`;
    })
    .join("\n");

  throw new Error(`Accessibility violations:\n${summary}`);
}
