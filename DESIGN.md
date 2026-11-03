---
name: Ignacio y María
description: A private critics' table for two, ruled like a film magazine's panel of verdicts.
colors:
  paper: "#f4f4f1"
  ink: "#131313"
  ink-muted: "#5c5b57"
  rule: "#d6d5cf"
  rule-strong: "#858480"
  surface: "#eaeae5"
  focus: "#131313"
  inverse-bg: "#131313"
  inverse-ink: "#f4f4f1"
  state-urgent: "#c8352b"
  state-watched: "#2f7d4a"
  state-rewatch: "#b07a10"
  state-no-rewatch: "#8a6bbf"
  state-awful: "#2f5fb3"
  paper-dark: "#111214"
  ink-dark: "#ebe9e4"
  ink-muted-dark: "#96948f"
  rule-dark: "#2a2b2e"
  rule-strong-dark: "#6b6c70"
  surface-dark: "#1b1c1f"
  focus-dark: "#ebe9e4"
  inverse-bg-dark: "#ebe9e4"
  inverse-ink-dark: "#111214"
  state-urgent-dark: "#e5594d"
  state-watched-dark: "#4fae6f"
  state-rewatch-dark: "#d9a23a"
  state-no-rewatch-dark: "#b29be0"
  state-awful-dark: "#5b8fe0"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.4
    fontFeature: "'tnum'"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.2
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  touch: "44px"
  row: "60px"
  table: "760px"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  add-action:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  text-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  filter-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  filter-chip-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  average-box:
    backgroundColor: "{colors.inverse-bg}"
    textColor: "{colors.inverse-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    padding: "0 6px"
    height: "40px"
    width: "48px"
  average-box-empty:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
  state-swatch:
    size: "14px"
    rounded: "{rounded.none}"
  critics-table-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "{spacing.row}"
    width: "{spacing.table}"
  critics-table-row-hover:
    backgroundColor: "{colors.surface}"
---

# Design System: Ignacio y María

## Overview

**Creative North Star: "The Critics' Table"**

Every title is a row in a film magazine's critics' panel: one column for María, one for Ignacio, and a verdict box at the right edge. The page is a ruled grid, not a wall of posters and not a stack of cards. Hairline rules carry the structure; a heavier ink rule closes the masthead and opens the table head. Type is one family, Archivo, used at two widths: condensed for titles, mastheads and the critics' names, normal width for everything you operate.

The world is restrained and nocturnal. It is built for a phone on a sofa in a dim room, so the dark theme is first-class: a near-black ground (never pure black) with warm off-white ink, mirrored by a light theme on cool paper (never pure white). Colour is reserved for the six watch states, each a small painted square beside its label, a nod to the Excel legend. Hierarchy comes from size contrast and one inversion: the average is the only element reversed out of the ground.

Surfaces are flat and square. There is no radius anywhere, no decorative shadow, no gradient. Motion is limited to quick state feedback (150ms colour and a 0.98 press scale), always switched off under reduced motion.

**Key Characteristics:**
- Ruled grid of hairlines; heavy 2px ink rules only at the masthead foot and the table head.
- Archivo variable: 75% width for titles, mastheads and critic names; normal width for UI; tabular figures for every number.
- Neutral paper and ink in both themes; colour only in the state swatches.
- The average box is the single inverted element.
- Square corners everywhere; 44px minimum touch target on every control.
- Theme follows Sistema / Claro / Oscuro, server-rendered via `data-theme` on `<html>`.

## Colors

A neutral paper-and-ink palette that inverts cleanly for a dark room, with five painted state hues as the only chroma.

### Primary
- **Press Ink** (light `ink`, dark `ink-dark`): all primary text, the 2px masthead and table-head rules, the primary button border, the selected-chip hairline, and the focus ring (`focus` mirrors ink). It is the system's only "accent": weight and placement do the work colour usually does.

### Neutral
- **Cool Paper** (`paper` / `paper-dark` Night Ground): the page ground and the resting fill of every control.
- **Pressed Paper** (`surface` / `surface-dark`): the hover ground for rows, buttons and chips, and the selected ground of chips and theme options.
- **Faded Ink** (`ink-muted` / `ink-muted-dark`): secondary text such as counts, year lines, column labels, hints and the empty average.
- **Hairline** (`rule` / `rule-dark`): row dividers and quiet table rules.
- **Marked Rule** (`rule-strong` / `rule-strong-dark`): control borders, the table-head bottom rule, the pending outline and the empty-average outline. Meets 3:1 non-text contrast on paper.
- **Verdict Inverse** (`inverse-bg` + `inverse-ink`, and their dark pair): reserved for the average box. In light it is ink on paper reversed; in dark it flips to off-white with the night ground reversed out.

### Tertiary (state swatches)
- **Urgent Red** (`state-urgent`): urgent to watch.
- **Watched Green** (`state-watched`): watched.
- **Rewatch Amber** (`state-rewatch`): watched, would rewatch.
- **No-Rewatch Lilac** (`state-no-rewatch`): watched, would not rewatch.
- **Awful Blue** (`state-awful`): watched and awful.
- Pending has no hue: an empty 2px Marked Rule outline.

The dark variants lift lightness so each swatch keeps 3:1 against the night ground. `src/lib/design/tokens.ts` is the single source; `globals.css` mirrors it and a sync test keeps both in step.

### Named Rules
**The One Inversion Rule.** Only the average box reverses out of the ground. No button, chip, header or banner may use `inverse-bg`; selection and action are expressed by rules and tinted ground instead.

**The Painted Square Rule.** State colour appears only as a 14px square swatch, always next to its text label. Never tint text, rows, borders or backgrounds with a state hue. The one exception is the error border of a text field, which borrows Urgent Red and is always paired with an "Error:" text line.

**The Never-Pure Rule.** No `#fff` and no `#000`. Light is cool paper on near-black ink; dark is a near-black ground with warm off-white ink.

## Typography

**Display Font:** Archivo at 75% width (with ui-sans-serif, system-ui)
**Body Font:** Archivo at normal width (same stack)

**Character:** One grotesk at two widths. The condensed cut reads like a magazine's set titles and critic names; the normal cut keeps controls plain and legible. Figures are always tabular so scores line up down the columns.

### Hierarchy
- **Display** (800, 2.75rem, line-height 1, condensed, tight tracking): the page masthead ("Vistas", "Sistema"), followed by its count in 1.5rem semibold Faded Ink tabular figures.
- **Headline** (800, 1.25rem, tabular): the figure inside the average box. The biggest number on a row, by design.
- **Title** (700, 1.0625rem, line-height 1.2, condensed): title names in rows, truncated to one line. The Añadir action uses condensed bold at 1.125rem.
- **Body** (400, 1rem): running text and input values; long text capped near 65ch.
- **Label** (500, 0.875rem): field labels, column labels, chips, state labels, hints. Critic names in the table head step up to condensed bold 1rem in full ink; guide words step down to condensed 0.75rem.

### Named Rules
**The Two Widths Rule.** Condensed width is for names (titles, mastheads, critics, the Añadir label, guide words). Everything you read to operate stays at normal width.

**The Tabular Figures Rule.** Every score, average, year, count and date uses tabular figures. Scores use the Spanish decimal comma (7,25 · 7,5 · 8).

## Layout

Mobile-first, one column. The table is the layout: a ruled grid on one module, centred and capped at 760px (`max-w-table`) on wider screens, with 16px side gutters on phones and 24px from `sm`.

The critics' table is a CSS grid with ARIA table roles: on phones `title | 44px | 44px | 48px` (title, María, Ignacio, Media); from `md` the score columns widen to 56px and a 96px date column is added. Rows are 60px tall. The table head is sticky at the top, 40px minimum, carrying guide words for the range in view.

Filter chips scroll horizontally in their own snap row on phones and wrap from `md`. Spacing follows the 4px Tailwind scale; the working steps are 8px between siblings, 12px inside controls and chip gaps, 20px inside medium buttons, and 56px between specimen sections. Every control is at least 44px tall.

The page's one primary action floats fixed at the bottom right, inside thumb reach, respecting safe-area insets; pages reserve bottom padding (about 112px) so it never covers the last row.

## Elevation & Depth

The system is flat. Depth is expressed by rules (hairline vs. 2px ink), by the tinted Pressed Paper ground, and by the single inversion. There is exactly one shadow, and it is functional.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 6px 16px rgb(0 0 0 / 0.22)`): only on the fixed Añadir action, because it floats over scrolling rows.

### Named Rules
**The Flat Table Rule.** Nothing at rest casts a shadow except the floating Añadir action. Rows, chips, fields and buttons separate by rules and ground, never by elevation.

## Shapes

Square everywhere (0px radius): buttons, fields, chips, the average box, swatches and the focus ring. Borders do the shaping: 1px for quiet controls, 2px for emphasis (masthead foot, table head top, primary button, pending outline, invalid field), and a 4px bottom rule as the mark of an action. Icons are an authored set on a 16px grid with a 2px round stroke in current ink, always decorative next to text.

## Components

### Buttons
Ruled and quiet; the action is marked by the weight of its rules, never by fill.
- **Shape:** square (0px), 44px minimum height, 20px side padding (12px at `sm`, same height).
- **Primary:** paper ground, ink text, 2px ink border with a 4px bottom rule, semibold.
- **Secondary:** 1px Marked Rule border, regular weight.
- **Ghost:** transparent border, underlined text (4px offset).
- **Hover / Active / Focus:** hover tints to Pressed Paper; press scales to 0.98 over 150ms ease-out; focus is a 2px ink outline at 2px offset. All transitions off under reduced motion.
- **Disabled:** border drops to Hairline and text to Faded Ink.

### Añadir (floating action)
The page's single primary action. Same ruled look as the primary button (2px ink border, 4px bottom rule, paper ground), 48px tall, condensed bold label with a plus mark, fixed bottom right above the safe area, and the system's only shadow.

### Chips
- **Style:** 44px, square, 1px Marked Rule border, paper ground, label size; optional state swatch before the label.
- **Selected:** Pressed Paper ground, ink hairline, semibold, and a check mark. Selection never takes the primary button's heavy rules.
- The theme toggle (Sistema / Claro / Oscuro) uses the same chip look over native radios.

### Inputs / Fields
- **Style:** 44px, square, 1px Marked Rule border on paper, 12px padding, Faded Ink placeholder. Label sits above in label size.
- **Focus:** the global 2px ink outline at 2px offset.
- **Error:** 2px Urgent Red border plus an ink "Error:" line below; hints sit below in Faded Ink.
- **Sort control:** a native select in the field look with an authored chevron in ink.

### Critics' Table (signature)
- **Head:** sticky, 2px ink rule on top, Marked Rule underneath; "Título" with guide words split off by a hairline; critic names in condensed bold ink; "Media" in Faded Ink label.
- **Row:** 60px, hairline below; title in condensed bold, then the year and state cell in Faded Ink; the two scores as tabular figures; the average box at the right edge. The whole row is the link target; hover tints to Pressed Paper and keyboard focus draws an inset 2px ink outline on the row.

### Average Box (signature)
An ink box (at least 48 by 40px) with the score reversed out in 1.25rem extra-bold tabular figures. With no scores it becomes a Marked Rule outline with a Faded Ink dash: the inversion is kept for a real average.

### State Cell
A 14px painted square followed by its Spanish label; pending is an empty 2px outline. The swatch is decorative and the label always carries the meaning.

### Masthead
Display-size condensed title with its count beside it on the baseline, closed by a 2px ink rule.

## Do's and Don'ts

### Do:
- **Do** keep both critics' scores side by side in equal columns; neither is privileged.
- **Do** use condensed Archivo (75% width) for names and normal width for operating text.
- **Do** use tabular figures and the decimal comma for every score and average.
- **Do** show state as a 14px swatch plus its label.
- **Do** keep every control at least 44px tall and every corner square.
- **Do** express selection with Pressed Paper, an ink hairline and a check mark; express action with the heavy 2px/4px ink rules.
- **Do** design the dark theme first-class and verify both themes, including the system-preference path.
- **Do** switch transitions off under `prefers-reduced-motion`.

### Don't:
- **Don't** invert anything except the average box.
- **Don't** use state hues as text, row or background colour.
- **Don't** use pure white or pure black.
- **Don't** round corners or add shadows to anything resting in the page; the floating Añadir is the only shadow.
- **Don't** replace the ruled table with a poster wall or a card list.
- **Don't** use icons without text; icons are decorative.
