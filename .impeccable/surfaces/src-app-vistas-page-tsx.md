---
version: 1
slug: "src-app-vistas-page-tsx"
primary_target: "src/app/vistas/page.tsx"
related_targets: []
---

# Surface brief: Watched list ("Vistas")

Scope: the watched list, first surface that proves the visual world. Mode: Operate.
Audience and job: Ignacio and María, on the phone on the sofa at night, scanning what they have watched, comparing their two scores, finding a title by search, state filter or sort (score or date).
Constraints: see PRODUCT.md. Code-led build (no image generation available). UI copy in Spanish, warm but sober. Avoid: anything cursi (hearts, roses) and anything cold or corporate.
Scene: two people on a sofa at night, lights low, TV just off, one phone between them. So the dark theme is first-class, not an afterthought; light theme follows the system setting.

## Direction contract

THESIS: You two are the critics' panel. Every title is a row in a film magazine's critics' table, with one column per critic (María, Ignacio) and the verdict box. It refuses the streaming poster wall and the generic card list.

OWN-WORLD: A ruled critics' grid: hairline rules, condensed grotesk titles (Archivo, width axis: condensed for titles and mastheads, normal for UI, tabular figures for every score). Restrained neutrals (paper #f4f4f1 / ink #131313 light; ground #111214 / ink #ebe9e4 dark, never pure white). The average is the only inverted element: an ink box with the figure reversed out, like a magazine rating box. State is a small painted cell (a square swatch, a nod to the Excel) plus its label: urgent red, watched green, rewatch amber, no-rewatch lilac, awful blue, pending empty outline.

STORY: They open Vistas and immediately see each title with both their scores side by side and the verdict. They believe the record is theirs and fair to both. They search, filter by state, sort by score or date, and tap a row to open its ficha.

FIRST VIEWPORT: At 390px: a masthead "Vistas" in heavy condensed type (~44px) with the count. Under it, a search field and a horizontally scrollable row of state filters with a sort control. A sticky column header acts as the table head (Título · María · Ignacio · Media), carrying guide words for the range in view. Rows are 60–64px: title condensed at 17px, year and state cell below it, two scores as small tabular figures, and the average as the inverted box at the right edge. The primary action "Añadir" is a fixed button at bottom right, within thumb reach. On desktop, the same table is centred, max 760px, with an extra date column.

FORM: Critics' table (magazine "consejo de críticos"), my top-ranked grounded candidate (1 of 7), chosen by the user as the pick card. Seed key c60de183. Raises kept from the round: hierarchy by size contrast (the average is the big figure), guide words in the sticky head, a dark theme built for a dark room, and the grid as real structure on one module. Signature interaction: tapping your own column in the ficha stamps your score into it, and the verdict box recomputes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions
- Exact specimen route and component inventory for D.2 (decided in the SDD change `design-system`).
- Score input control for the ficha (stepper, slider or quick buttons), decided in 1.6.
