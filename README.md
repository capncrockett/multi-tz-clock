# multi-tz-clock

A single analog clock face with multiple color-coded hour hands, one per time zone. At a glance, see relative time differences between cities without scanning multiple dials.

## Quick Start

Open `index.html` in any modern browser. No build step, no dependencies.

Launch the Electron desktop proof of concept:

```bash
npm run desktop:start
```

Launch the Tauri desktop spike (requires a Rust toolchain plus the Tauri prerequisites for your OS):

```bash
npm run desktop:tauri:dev
```

Create an unpacked desktop build under `dist/pack*`:

```bash
npm run desktop:pack
```

Build the Windows installer under `dist/dist*`:

```bash
npm run desktop:dist
```

Build the Tauri desktop host:

```bash
npm run desktop:tauri:build
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

Run the static dev-host reliability tests:

```bash
npm run test:dev-host
```

Run the desktop migration verification stack:

```bash
npm run test:desktop
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

## File Layout

- `index.html` - Markup and UI structure
- `assets/css/theme.css` - Shared theme tokens for DOM + canvas rendering
- `assets/css/main.css` - App styles and responsive/theming rules
- `assets/js/clock-utils.js` - Shared pure logic for layout tiers, timezone grouping, and nearest-city lookup
- `assets/js/desktop-shell.js` - Browser-safe bridge that maps Tauri onto the existing desktop renderer contract
- `assets/js/app.js` - App logic, rendering, time math, and interactions
- `desktop/window-config.cjs` - Pure Electron window and tray descriptors used by tests
- `desktop/main.cjs` - Electron main-process host for the desktop POC
- `desktop/preload.cjs` - Desktop-only renderer bridge and shell flag
- `scripts/serve-static.cjs` - Static dev server for Tauri against the existing browser frontend
- `scripts/prepare-tauri-dist.cjs` - Copies `index.html` + `assets/` into a minimal Tauri frontend bundle
- `src-tauri/` - Tauri v2 desktop host scaffold
- `tests/unit/*.jest.test.js` - Jest unit tests
- `tests/integration/*.integration.jest.test.js` - Jest integration tests
- `ARCHITECTURE.md` - Technical deep dive for engineering handoff
- `ROADMAP.md` - Multi-phase platform plan

## Desktop POC (Phase 2 direction)

- Electron host around the existing browser app
- Frameless transparent window with a desktop-only drag bar
- Always-on-top behavior enabled by default
- Desktop launches in clock-only mode by default; `Show UI` restores the full controls/chip chrome
- Three preset window sizes (`xsmall`, `small`, `medium`) with fixed full-UI and clock-only bounds per preset and no desktop scrolling
- System tray click to show/hide the whole widget, plus menu actions for UI chrome toggle, pin toggle, Windows launch-on-startup, and quit
- Desktop-only host preferences persist to a local JSON file under Electron `userData`; browser zones/toggles still persist in `localStorage` with IndexedDB fallback
- Windows packaging is wired through Electron Builder with `desktop:pack` for unpacked smoke builds and `desktop:dist` for the NSIS installer

Still pending for Phase 2:

- Finish porting Electron shell behaviors to Tauri: tray, startup, preference persistence, and packaging parity
- Keep Electron only as a fallback until Tauri reaches parity

Platform direction:

- Browser remains the source of truth for clock behavior and shared logic.
- Electron is the current working desktop shell.
- Tauri is the chosen target for the long-term desktop host because this app is small enough that bundled-browser overhead is disproportionate.
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
