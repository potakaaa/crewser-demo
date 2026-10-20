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

Browser back/forward works. In-app back buttons return to where you came from; a cold deep link goes back to a sensible parent.

## Demo controls (desktop only)

Beside the phone: **Reset demo** and a **Demo controls** panel (hidden by default) with:
- **Offline:** amber banner on Home and Calendar
- **Empty:** nothing on the sheet; the week card still shows
- **No code in PDF:** boarding-pass fallback

The panel also has shortcuts to jump to each screen.

## Structure

```
src/
  mock/         typed mock data: notes, week, person, project, today, pdfs (+ shared types)
  lib/          derivations: stats from `week`, smart-note ordering, dates, fake QR, scroll memory, click actions
  components/   device frame + status bar, tab bar, log sheet, toast, note cards/rows, charts, layout pieces
  screens/      Home, Calendar, Stats, NoteDetail, BoardingPass, PdfViewer
  styles/       tokens.css (design tokens), base.css, device.css (frame/page), app.css (components)
  store.ts      Zustand store: in-memory state, hash routing with a back-stack
```

Stack: Vite, React 19, TypeScript, Zustand, plain CSS with variables. Icons: Hugeicons Stroke Rounded (free set). Fonts: DM Sans and Bebas Neue (stand-in for Tallica), self-hosted via `@fontsource`, so the page makes no third-party requests.

## How the data drives the UI

- **Week statistics** (`lib/stats.ts`): total 67.5 h, over target +7.5 h, overtime 7.5 h, average 11.25 h over 6 worked days, night 3.5 h and longest day Fri 16 at 12.5 h. All are computed from `week` and `project.dailyTargetHours`. The default selected bar is the longest day.
- **Smart notes** (`lib/notes.ts`):
  - **Next-up card:** the next shoot-day call today.
  - **Top three content cards:** the next timed appointments, flights and hotels ("call times and travel first").
  - **The rest:** grouped by day under "Show N more notes".
- **Fact tiles on a card:** facts you act on come first (copy, map, unconfirmed), filled up in data order. Map facts and attachments span both columns.
- **Log today:** the "Planned 11:00–22:00 is X h after the break…" line and the stats insight both recalculate from the break stepper.
