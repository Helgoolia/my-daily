# My Daily — rules for Claude (and people)

Weekly time tracker, web, React + Vite + TypeScript. Design source: Figma file **My Daily Web**
(`9qOhSmri6j1sX02REZgfVo`) — pages Design and Components. The designer (Olha) makes the design
decisions; match the Figma screens and component descriptions, ask when they disagree.

## Commands
- `npm run dev` — local app at http://localhost:5173 (a sample week appears in dev, or with `?demo` on any build)
- `npm test` — unit tests (Vitest) · `npm run build` · `npm run lint`

## Styling
- Plain CSS with tokens from `src/styles/tokens.css` (generated from Figma variables). Never hard-code
  colours, spacing or radii — use `var(--…)`. No Tailwind.
- Text styles keep their Figma names: Body/M → `.t-body-m`, Numeric/S-Medium → `.t-numeric-s-medium`, Numeric/M (Regular, week cells) → `.t-numeric-m`, etc.
- Fonts: **Fixel Text** for all text; **Public Sans** only inside Numeric styles — digits and `: – ·`
  spaces, never words (it has no Cyrillic; the @font-face `unicode-range` enforces this).
- Themes: system by default; `<html data-theme="light|dark">` overrides. Colours use `light-dark()`.
- Focus ring = element radius + 4. Hover = base fill + `--state-hover`. Disabled = `--opacity-disabled`,
  except Primary Disabled (`--bg-disabled` + `--text-disabled`).

## Data (see docs/data-model.md)
- Everything is in `localStorage` under `mydaily`, versioned. Totals are never stored — derive them.
- The timer is a start time (`startedAt`), not a counter.
- Every remove/delete has Undo.

## Copy & language
- UI in English and Ukrainian (`src/lib/i18n.ts`). Ukrainian copy is written, not machine-translated —
  ask Olha when a new string is needed.
- Dates: no year for the current year; shared PNG/link always show the year.

## Layout
- ≥1280 sidebar open · 1024–1279 sidebar collapses (opens over the grid) · 900 columns compress
  (task 200, today 140, total 88, days ≥ 64) · 768–899 grid scrolls sideways (Task sticks left, Total right,
  header stays, Share becomes icon-only) · <768 "Make the window wider" stub.

## Workflow
- Work on a branch, open a PR; Olha reviews in the browser (Vercel preview) and merges.
