# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two people only: Ignacio and María, a couple. Access is limited to their two allowlisted accounts. Each has a personal score per title and can only edit their own.

Primary scene: on the phone, on the sofa. They log and rate a title right after watching it, and they pick something to watch from the pending list. Desktop is secondary.

## Product Purpose

Replaces the *Pelis* sheet of the shared Excel `Ignacio y María.xlsx` (276 rows): a shared record of the movies and series they have watched or want to watch, with both scores, the average, the watch date and notes.

Success means adding and rating a title on the phone in under 30 seconds, and the web doing everything the sheet did, plus posters and metadata from TMDB.

## Positioning

A private record for two, not a social or public catalog. Two personal scores side by side and their average are the core of every title, the way the sheet has always worked.

## Operating Context

- Mostly one-handed phone use, often at night in a dim room after watching something.
- Titles come from a TMDB search, or are entered by hand when TMDB does not find them.
- Existing history is imported from the Excel sheet (step 1.7). Its data is dirty: unknown dates ("No se acuerda"), titles with no scores, series mixed with movies.

## Capabilities and Constraints

- Scope is movies and series only. Restaurants, board games and books are out of scope.
- States are exactly the six from the Excel legend: urgent to watch, watched, watched (rewatch), watched (no rewatch), watched and awful, pending.
- Scores are 0 to 10 in steps of 0.25. Each title has María's score and Ignacio's score, both optional. The average uses only existing scores and is empty when there are none, never an error.
- The watch date can be unknown.
- Stack: Next.js App Router, Supabase, Vercel. Only server code talks to Supabase and TMDB.
- UI copy is in Spanish.

## Brand Commitments

- Name: "Ignacio y María".
- Voice: warm but sober, in Spanish. Close and friendly, no jokes. A pleasant tool that does not call attention to itself.
- State colors from the Excel (red urgent, green watched, yellow rewatch, light purple no rewatch, blue awful) are inspiration, not a rule. They should feel recognizable, but the design may change them.

## Evidence on Hand

- Real data: the Excel sheet *Pelis* (276 rows), not in the repository. It is imported in step 1.7.
- Posters and metadata from TMDB. TMDB attribution is required.
- No logo or other brand assets exist.

## Product Principles

1. Speed on the phone beats completeness: logging and rating must be nearly instant.
2. Both voices count equally: the two scores always appear together and neither person's score is privileged.
3. Forgiving with missing data: missing scores, unknown dates and manual titles are normal, not errors.
4. Private and calm: it is a shared notebook, not a feed.
