# CLAUDE.md

Guidance for Claude Code (and the agent office) when working in this repo.

## What this is

crewser-demo is a frontend-only, clickable prototype of the Crewser crew app (version 4 in the UI copy, `crewser-crew-app-v3` in `package.json`). Crewser is time tracking and crew management for film, TV and commercial productions; this prototype shows a crew member's phone app: dashboard with smart notes, calendar, documents, contacts, settings, a boarding-pass ticket and a PDF viewer, plus the project-switching proposal in `docs/project-switching.md` (project switcher, per-link drafts and hours, expired/revoked links, entering hours for a colleague, notifications per link). Everything is mock data in `src/mock/`; there is no backend, auth or network call. The demo clock is frozen to Mon 19 Oct 2026, 08:40. Deployed as a static site on Vercel. The product, film-production primer and the owner's role are in the Crewser Obsidian vault (`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Crewser/Home.md`).

## Stack

Vite 6, React 19, TypeScript 5.8 (strict), Zustand 5 for state, plain CSS with custom properties (no CSS framework), Hugeicons (free set), Fontsource fonts. Tests: Vitest. Lint: ESLint 9 flat config with typescript-eslint and react-hooks. Node 18+ (README says built with 22; verified here on Node 24, npm 11). No router library: hash routing is in `src/store.ts`.

## Commands

Run from the repo root. All of these were run and pass on a clean `npm ci`.

| Task | Command |
|---|---|
| Install (exact, as Vercel does) | `npm ci` |
| Dev server (http://localhost:5173) | `npm run dev` |
| Typecheck | `npm run typecheck` (`tsc -b`, no emit) |
| Lint | `npm run lint` (errors fail; one known `exhaustive-deps` warning in `ScreenStack.tsx`) |
| Test (all) | `npm test` (`vitest run`, exits by itself; `CI=1` is fine) |
| One test file | `npx vitest run src/lib/dates.test.ts` |
| Build | `npm run build` (typecheck + `vite build` into `dist/`) |
| Preview the build | `npm run preview` |

The office hook (`.claude/hooks/require-checks.sh`) runs `lint`, `typecheck` and `test` when a task completes. On the shared Mac, tests and builds go through `test-gate` (see `.claude/agents/senior-dev.md`).

## Folder map

```
src/
  main.tsx, App.tsx     entry, fonts and CSS imports; app shell
  store.ts              the one Zustand store: routes, sheets, hash routing with a back stack, font theme, demo flags
  mock/                 typed mock data (types, crew, notes, workdays, documents, contacts, projects/links, notifications)
  lib/                  pure derivations: dates (UTC ISO strings), stats (hours/overtime), notes ordering, timeline, scroll memory, QR, grain
  screens/              one file per screen: Dashboard, Calendar, Documents, Contacts, Settings, BoardingPass, PdfViewer
  components/           device frame, tab bar, bottom sheets, log sheet, note cards, project switcher, icons, brand; settings/ holds prefs
  styles/               tokens.css (design tokens), base, device, app, dashboard, calendar, timeline, notifications, screens
  assets/               Crewser logo PNGs (dark and light)
public/                 favicon
docs/                   project-switching.md (the design proposal this prototype demonstrates)
screenshots/            six older review PNGs are tracked; the owner's local screenshots/v4 and screenshots/wip are untracked
deliverables/           PDF hand-off and its build scripts: untracked, exists only in the owner's checkout (not in a worktree)
.claude/, office.sh     agent office setup (agents, settings, hooks)
```

## Conventions seen in the code

- **Mock data is the only data.** Statistics and totals are derived from the typed arrays in `src/mock/` (`lib/stats.ts`), never hard-coded, so the numbers always agree. Nothing reads the real clock: use `today` and `NOW` from `src/mock`.
- **Dates are ISO `YYYY-MM-DD` strings** handled in UTC by `src/lib/dates.ts`. Add helpers there instead of using `Date` in components.
- **Design tokens only.** Colours, radii (10 px controls, 18 px cards and sheets, nothing else), type scale and spacing come from `src/styles/tokens.css`. Add a token rather than an inline value. Respect `prefers-reduced-motion`.
- **Icons** go through `src/components/Icon.tsx`. **Fonts** are five themes (Inter, Screenplay, Poster, Editorial, Credits; Poster is the default); check UI changes in each.
- **Phone first.** The app sits in a 393 x 852 frame on desktop and renders full screen at 480 px and below. Check 360, 375 and 393 px. Touch targets 44 px, text contrast 4.5:1, visible focus.
- **Routing is hash based** (`#/calendar`, `#/note/<id>`, `#/pdf/<file>`), so `dist/` works on any static host. Keep deep links working.
- **TypeScript is strict** with unused locals and parameters as errors. Short doc comments explain why, in plain sentences; comment density in `src/lib` and `src/store.ts` is the model.
- **Tests** sit next to the code as `*.test.ts` (Vitest, node environment). Test the pure code in `src/lib` and `src/mock`; there are no component tests yet.
- Commit messages are short, plain sentences describing the user-visible change.

## Branch flow

Today: feature branch -> PR into `main` (solo repo). When this becomes a production app: feature -> `development` -> `main`, never push to `main` directly.

Work on a branch, not on `main`. The active product branch on 25 Oct 2026 is `feat/crew-app-v4` (many commits ahead of `main`, not merged yet). Agents never push; the owner pushes and merges.

## Secrets and local files

`.env.local` is a Vercel CLI file with an OIDC token. It is git-ignored; never print, copy or commit it. `.vercel/` is the project link, also ignored.

## Unknowns (ask the owner)

- Whether this repo will ever be the production app, or the production module is built elsewhere (Flutter is mentioned for the phone app in the vault).
- Where the real Crewser logo and brand guide live beyond `src/assets/`.
- Whether component or end-to-end tests are wanted (no Playwright or component test setup exists).
- `README.md` is partly stale (it describes the older v3 screens such as Stats and NoteDetail and a text wordmark). Trust the code and this file first.
- The `package.json` name and version (`crewser-crew-app-v3`, 0.3.0) were not renamed for v4.
