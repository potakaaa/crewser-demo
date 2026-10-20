# Crewser crew app v3 · clickable prototype

A frontend-only, fully mocked prototype of the Crewser crew app (film/TV crew time tracking, Vienna). Open one URL and an iPhone 16 (393 × 852) appears on screen. You can click through every screen: Home with smart notes and your week, Calendar, Statistics, note details, the boarding pass, the PDF viewer and the Log today sheet. There is no backend, auth or network call, and no real data. Every value comes from typed mock data in `src/mock/`, and every statistic is derived from the `week` array, so the numbers always agree. The demo clock is frozen to Mon 19 Oct 2026, 08:40. On a phone (viewport ≤ 480 px) the app renders full screen without the frame.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc) + production build into dist/
npm run preview    # serve dist/ locally
```

Node 18+ (built and tested with Node 22).

## Deploy

The build is static and uses hash routing with a relative base, so `dist/` works on any static host or sub-path.

- **Vercel:** import the repo. `vercel.json` sets the Vite framework, `npm run build` and `dist/`.
- **Netlify:** build command `npm run build`, publish directory `dist`.
- **GitHub Pages:** publish the contents of `dist/` (for example with `actions/deploy-pages`). No 404 redirect is needed.

## Shareable routes

| Hash | Screen |
|---|---|
| `#/home` | Home |
| `#/calendar` | Calendar |
| `#/stats` | Statistics |
| `#/note/<id>` | Note detail (`d7`, `cat`, `d8`, `fl`, `ho`, `re`, `d9`, `em`) |
| `#/ticket` | Boarding pass |
| `#/pdf/<file>` | PDF viewer (`Ticket_OS487.pdf`, `Reservation_FNC-4471.pdf`) |

Bare-token forms also work (`#stats`, `#note-fl`, `#pdf-Ticket_OS487.pdf`) for hosts that only pass plain anchors. Browser back/forward works. In-app back buttons return to where you came from; a cold deep link goes back to a sensible parent.

## Demo controls (desktop only)

Beside the phone: **Reset demo** and a **Demo controls** panel (hidden by default) with:
- **Offline:** amber banner on Home and Calendar
- **Empty:** nothing on the sheet; the week card still shows
- **No code in PDF:** boarding-pass fallback

The panel also has shortcuts to jump to each screen.

## Structure

```
src/
  mock/         typed mock data: notes, crew, workdays, contract, person, project, today, pdfs (+ shared types)
  lib/          derivations: stats from `week`, smart-note ordering, dates, fake QR, scroll memory, click actions
  components/   device frame + status bar, tab bar, log sheet, toast, note cards/rows, charts, layout pieces
  screens/      Home, Calendar, Stats, NoteDetail, BoardingPass, PdfViewer
  styles/       tokens.css (design tokens), base.css, device.css (frame/page), app.css (components)
  store.ts      Zustand store: in-memory state, hash routing with a back-stack
```

Stack: Vite, React 19, TypeScript, Zustand, plain CSS with variables. Icons: Hugeicons Stroke Rounded (free set). Font: Inter (400/500/600), self-hosted via `@fontsource`, so the page makes no third-party requests.

## Motion and brand

- Screen transitions (`components/ScreenStack.tsx`) keep the outgoing screen mounted while it animates. Pushes slide in from the right, back slides out to the right, and tab switches cross-fade. All moving parts share one easing curve (`--ease-ios`).
- The tab bar computes tab widths up front, so the white pill, the icons and the active label move together.
- Note types have their own colours (`lib/noteStyle.ts`). They are used on icon chips, calendar dots and the month-view legend.
- The Calendar header chip opens a month view; prev/next then pages by month.
- Film grain (`lib/grain.ts`) is one generated noise tile overlaid on the gradient headers and dark tiles.
- `prefers-reduced-motion` turns all of this off.
- **Logo:** `components/Brand.tsx` renders "Crewser" as a text wordmark because the official logo could not be downloaded from crewser.app in the build environment. Swap that one element for the logo SVG and the splash, Home footer and desktop caption all pick it up.

## How the data drives the UI

- **Statistics** (`lib/stats.ts`): every logged day in `workdays` has start, end, break and approval status. Hours, overtime (past the 10 h target), night hours (22:00–06:00), rest between shifts (11 h minimum) and the pay estimate (`contract`) are all derived from those times. For CW 42 that gives 67.5 h, +7.5 h overtime, an 11.25 h average, 3.5 h at night, one 10.5 h rest and ~€3,066. The camera-prep days the week before give "vs last week" something to compare against. The project view covers prep plus shoot.
- **Statistics screen:** Week/Project switch with week paging, a shift timeline for the tapped day, and drill-down sheets for overtime, average, night, rest, approvals and pay. Submitting a day moves it from *Not submitted* to *Waiting*.
- **Smart notes** (`lib/notes.ts`):
  - **Next-up card:** the next shoot-day call today.
  - **Top three content cards:** the next timed appointments, flights and hotels ("call times and travel first").
  - **The rest:** grouped by day under "Show N more notes".
- **Who's on a note:** each note is shared with the whole crew (20) or a list of crew ids, e.g. the 9 going to Madeira. Cards, expanded rows and the detail show an avatar stack (3 + "+N") and the label, e.g. "You + 8 others". Tapping it opens the list grouped by department. The first five crew and their avatar tints come from the Inspector board.
- **Fact tiles on a card:** facts you act on come first (copy, map, unconfirmed), filled up in data order. Map facts and attachments span both columns.
- **Log today:** the "Planned 11:00–22:00 is X h after the break…" line and the stats insight both recalculate from the break stepper.
