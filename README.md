# multi-tz-clock

A single analog clock face with multiple color-coded hour hands, one per time zone. At a glance, see relative time differences between cities without scanning multiple dials.

## Quick Start

Open `index.html` in any modern browser. No build step, no dependencies.

Launch the desktop app in Tauri dev mode:

```bash
npm run desktop:dev
```

This wrapper starts or reuses the local static frontend server before launching `tauri dev`, instead of relying on Tauri's `beforeDevCommand`.

Build the Tauri desktop host:

```bash
npm run desktop:build
```

## Automated Testing

Install dependencies and browser once:

```bash
npm install
npx playwright install chromium
```

Run Node unit + integration tests (Jest):

```bash
npm run test:node
```

Run only unit tests:

```bash
npm run test:unit
```

Run only integration tests:

```bash
npm run test:integration
```

Run the Tauri host unit tests:

```bash
npm run test:tauri
```

Run the native Tauri smoke harness on Windows:

```bash
npm run test:tauri:smoke
```

This builds the release app, launches the real Windows executable, and verifies that the frontend reports a live desktop shell plus the expected host state, including native always-on-top state, close-to-tray interception, and persisted host preferences.

Remaining native checks that are still reasonable to do manually in under 30 seconds:

- open `npm run desktop:dev`
- left-click the tray icon once to hide the window and once to restore it
- visually confirm the frameless transparent window still looks correct on your desktop

Run the static dev-host reliability tests:

```bash
npm run test:dev-host
```

Run the desktop migration verification stack:

```bash
npm run test:desktop
```

Run the strongest desktop parity proof stack:

```bash
npm run test:desktop:proof
```

Run the end-to-end smoke suite (Playwright):

```bash
npm run test:e2e
```

Run only the desktop-focused Playwright coverage:

```bash
npm run test:e2e:desktop
```

Run all suites:

```bash
npm test
```

GitHub Actions CI now lives in `.github/workflows/ci.yml` and stays repo-local:

- browser verification runs `npm test` on Ubuntu
- desktop proof runs `npm run test:desktop:proof` on Windows
- workflow commands execute only against this repository checkout

## Browser Deploy

The browser app deploys through Vercel's native Git integration rather than a GitHub Actions CLI workflow.

- connect this repository to the `multi-tz-clock` Vercel project
- let Vercel create preview deploys for pull requests and production deploys from `main`
- keep `.vercel/` local and ignored by git if you use the Vercel CLI for repo-local linking or debugging
- keep GitHub Actions focused on verification while Vercel owns browser deployment

Useful variants:

- `npm run test:e2e:headed` - run tests with a visible browser
- `npm run test:e2e:ui` - open Playwright UI mode
- `npm run test:e2e:report` - open the latest HTML report

## Agent Workflow

This repo now includes strict agent guard rails in `AGENTS.md` plus local git hooks in `.githooks/`.

- Hooks are installed automatically on `npm install` via `prepare`
- Reinstall hooks manually with `npm run hooks:install`
- Commits are blocked if there are leftover unstaged or untracked files
- Non-doc commits run the full test suite before commit
- Pushes are blocked unless the working tree is clean and tests pass
- Commit messages must use a conventional format such as `fix(clock): adjust hand spacing`
- Guard scripts and CI workflow are scoped to this repository only

## File Layout

- `index.html` - Markup and UI structure
- `assets/css/theme.css` - Shared theme tokens for DOM + canvas rendering
- `assets/css/main.css` - App styles and responsive/theming rules
- `assets/js/clock-utils.js` - Shared pure logic for layout tiers, timezone grouping, and nearest-city lookup
- `assets/js/desktop-shell.js` - Browser-safe bridge that maps Tauri onto the existing desktop renderer contract
- `assets/js/app.js` - App logic, rendering, time math, and interactions
- `desktop/window-presets.json` - Shared desktop preset definitions consumed by the Tauri host
- `scripts/start-tauri-dev.cjs` - Tauri dev wrapper that owns frontend-server lifecycle
- `scripts/serve-static.cjs` - Static dev server for Tauri against the existing browser frontend
- `scripts/prepare-tauri-dist.cjs` - Copies `index.html` + `assets/` into a minimal Tauri frontend bundle
- `scripts/test-tauri-smoke.cjs` - Native Windows smoke harness for the built Tauri app
- `src-tauri/` - Tauri v2 desktop host scaffold
- `tests/unit/*.jest.test.js` - Jest unit tests
- `tests/integration/*.integration.jest.test.js` - Jest integration tests
- `ARCHITECTURE.md` - Technical deep dive for engineering handoff
- `ROADMAP.md` - Multi-phase platform plan

## Desktop Host (Phase 2)

- Tauri host around the existing browser app
- Frameless transparent window with a desktop-only drag bar
- Always-on-top behavior enabled by default
- Desktop launches in clock-only mode by default; `Show UI` restores the full controls/chip chrome
- Three preset window sizes (`xsmall`, `small`, `medium`) with fixed full-UI and clock-only bounds per preset and no desktop scrolling
- System tray click to show/hide the whole widget, plus menu actions for UI chrome toggle, pin toggle, Windows launch-on-startup, and quit
- Desktop-only host preferences persist to a local JSON file under the app config directory; browser zones/toggles still persist in `localStorage` with IndexedDB fallback
- Windows packaging is handled by Tauri via `npm run desktop:build`, producing native `.exe`, `.msi`, and NSIS bundles under `src-tauri/target/release/`

Still pending for Phase 2:

- Keep expanding native-host verification where it is reliable and fast
- Finish the short manual smoke pass for tray click restore, close-to-tray, and visual polish as part of desktop release readiness

Platform direction:

- Browser remains the source of truth for clock behavior and shared logic.
- Tauri is the desktop host.
- Future Windows, macOS, iOS, and Android ports should reuse the shared clock/timezone logic rather than inherit desktop-shell implementation details.

## Features (Phase 1 MVP)

- Up to 6 timezone hands in distinct colors
- Bezel labels with optional TZ/city text switch, or legend-only mode
- Three viewport tiers: medium, small, xsmall
- 12h / 24h toggle
- 24h face day/night shading via NOAA sunrise/sunset math
- Add/remove zones from a 31-city catalog
- Local storage persistence for zones and display toggles
- IndexedDB fallback for persistence when `localStorage` is unavailable
- `Local` zone action using geolocation with browser-timezone fallback
- Minute-accurate hand grouping for +30 / +45 offset zones
- Stacked bezel chips when two zones share one visible hand position
- Responsive compact mode for small viewports
- Accessible controls, skip link, and live region updates
- Light/dark theme support via `prefers-color-scheme`
- Reduced motion support via `prefers-reduced-motion`

## Timezone Precision

Hour-hand grouping is now minute-accurate for both 12h and 24h faces, so sub-hour offsets such as `UTC+5:30` and `UTC+5:45` keep distinct hand positions instead of collapsing into one shared hour bucket.

## Controls

- `Bezel`: show/hide inner bezel labels
- `Sec`: second-hand toggle
- `24h`: 24-hour face toggle
- `City`: switches bezel text between TZ abbreviation and city name (disabled when Bezel is off)
- `Local`: adds the closest catalog city for your current location, with browser-timezone fallback if geolocation is unavailable
- `Debug`: show live viewport/layout overlay stats
- `Frames`: show clickable component frame outlines (disabled when Debug is off)

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [ROADMAP.md](ROADMAP.md)

## License

MIT
