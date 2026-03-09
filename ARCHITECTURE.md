# Architecture - Multi-TZ Clock (Phase 2 desktop migration)

This document is written for AI coding agents and engineers migrating this project across platforms.

Current platform direction:

- Browser remains the product source of truth.
- Electron is the working desktop fallback shell that proved the widget UX.
- Tauri is the selected Phase 2 desktop target to replace the Electron shell once parity is reached.
- Later Windows, macOS, iOS, and Android ports should preserve the shared clock/timezone logic instead of inheriting desktop-host implementation details.

## File Layout

```
index.html           - App shell markup and DOM structure
assets/css/theme.css - Shared theme tokens for DOM + canvas rendering
assets/css/main.css  - Layout, accessibility, and responsive rules
assets/js/clock-utils.js - Shared pure layout, timezone-grouping, and nearest-city helpers (browser + Node)
assets/js/desktop-shell.js - Browser-safe desktop bridge that lets Electron and Tauri expose the same renderer contract
assets/js/app.js     - All runtime logic (state, time math, rendering, interactions)
desktop/window-presets.json - Shared desktop size presets consumed by both Electron and Tauri hosts
desktop/window-config.cjs - Pure Electron window/tray descriptors used by tests + main process
desktop/preferences.cjs - Desktop host preference normalization + local JSON persistence
desktop/main.cjs     - Electron host process (window lifecycle, tray, shell behaviors)
desktop/preload.cjs  - Desktop-only bridge that tags the renderer for host-specific UI
scripts/build-electron.cjs - Packaging wrapper that assigns a fresh `dist/` output folder per build
scripts/serve-static.cjs - Static file server used by `tauri dev` against the existing browser app
scripts/prepare-tauri-dist.cjs - Copies `index.html` + `assets/` into a minimal frontend folder for Tauri builds
src-tauri/           - Tauri v2 host scaffold (config, capabilities, icons, Rust entrypoint)
build/icon.png       - Packaged desktop app icon used by Electron Builder
tests/unit/*.jest.test.js - Jest unit tests for pure utility logic
tests/integration/*.integration.jest.test.js - Jest integration tests for composed layout rules
tests/e2e/*.spec.js  - Playwright browser smoke tests
jest.config.cjs      - Jest config
playwright.config.js - Playwright test runner config (Chromium project)
package.json         - npm scripts for node + e2e tests
ROADMAP.md           - Browser -> Desktop -> Windows -> Apple -> Android plan
ARCHITECTURE.md      - This file
README.md            - User-facing overview
```

## Runtime Structure

### `index.html`
Contains:

1. App metadata in `<head>`.
2. External stylesheet references:
- `assets/css/theme.css`
- `assets/css/main.css`
3. UI structure in `<body>`:
- Skip link
- `#desktop-drag-bar` desktop-only drag handle (hidden in browser mode)
- `#controls` toolbar
- `<canvas id="clock">`
- `#sr-times` live region
- `#zone-status` live region
- `#zone-bar`
4. External script references (both `defer`):
- `assets/js/clock-utils.js`
- `assets/js/app.js`

### `assets/css/main.css`
Contains:

1. Layout and typography for controls, canvas, and zone chips.
2. Shared chip styles that consume theme tokens.
3. Desktop-shell overrides for frameless drag behavior and transparent window padding.
4. Accessibility helpers (`.skip-link`, `.sr-only`, focus states).
5. Responsive adjustments for narrow screens.

### `assets/css/theme.css`
Contains:

1. High-level theme tokens for app surfaces, text, and accents.
2. Shared day/night chip tokens used by both zone chips and bezel labels.
3. Canvas-specific tokens for clock face, ticks, numerals, and hands.
4. Light-mode overrides in one place for future multi-theme expansion.

### `assets/js/app.js`
Contains these logical sections:

- CITY CATALOG: `CITY_CATALOG[]`
- CONSTANTS: `HAND_COLORS[]`, `MAX_ZONES`
- STATE: `zones[]`, canvas context, viewport flags
- SIZING: `resize()`
- PERSISTENCE: `restorePersistedState()`, `persistAppState()` with IndexedDB fallback
- HELPERS: `getTimeInTZ()`, `getTzAbbrev()`, local-zone resolution
- NOAA SUNRISE/SUNSET: `getSunTimes()`, `isDaytime()`
- DEDUPE/SORT: `dedupeZones()`, `sortByTime()`
- ZONE BAR: `renderZoneBar()`, `updateZoneBarTimes()`, `addZone()`, `removeZone()`, `addLocalZone()`
- DRAWING: `drawDayNightFace()`, `drawPlainFace()`, `drawFace()`, `drawHand()`, `drawMinuteSecondHands()`
- ACCESSIBILITY: `updateScreenReader()`
- MAIN LOOP: `draw()`

### `desktop/window-config.cjs`
Contains pure helpers for Electron host setup:

- shared preset loading from `desktop/window-presets.json`
- `createMainWindowOptions()`
- `getClockHtmlPath()`
- `createTrayMenuEntries()`

### `desktop/preferences.cjs`
Contains desktop-host preference helpers:

- `normalizeDesktopPreferences()`
- `getDesktopPreferencesPath()`
- `readDesktopPreferences()`
- `writeDesktopPreferences()`

### `desktop/main.cjs`
Contains Electron-specific host logic:

- window creation and hide-to-tray lifecycle
- tray icon and context menu
- always-on-top toggle wiring
- Windows login-startup wiring
- desktop preference load/save under Electron `userData`
- desktop app activation and quit flow

This Electron host is now considered an interim fallback shell, not the final desktop direction.

### Packaging

- `package.json` contains the Electron Builder config for Windows packaging.
- `npm run desktop:pack` creates an unpacked app directory for local packaging smoke checks.
- `npm run desktop:dist` builds the Windows NSIS installer into `dist/`.
- `npm run desktop:tauri:dev` starts a static Node server for the existing frontend and launches the Tauri host.
- `npm run desktop:tauri:build` stages `index.html` + `assets/` into `.tauri-dist/` and builds the Tauri host.

These packaging paths remain useful until a Tauri build path reaches feature parity.

### `desktop/preload.cjs`
Contains a minimal `window.desktopShell` bridge and marks the document with `data-shell="desktop"` so the existing frontend can expose desktop-only drag affordances without changing browser behavior.

### `assets/js/desktop-shell.js`
Contains the desktop-shell bridge used outside Electron:

- leaves browser behavior untouched when no desktop host is present
- preserves Electron's existing `window.desktopShell` contract when the preload bridge already provided it
- maps Tauri `invoke` commands onto the same `getWindowSizePreset()`, `setWindowSizePreset()`, `getUiVisibility()`, and `setUiVisibility()` hooks used by `assets/js/app.js`
- listens for Tauri-emitted desktop host events so tray actions can keep the existing renderer contract synchronized
- marks the document with `data-shell="desktop"` so the existing CSS and renderer logic stay source-of-truth

### `assets/js/clock-utils.js`
Contains pure functions used by both browser runtime and Jest tests:

- `deriveViewportFlags()`
- `is24hNumeralVisible()`, `is12hNumeralVisible()`
- `get24hNumeralStyle()`, `get12hNumeralStyle()`
- `getBezelLabelLayout()`
- `getHourHandValue()`, `getZoneGroupKey()`
- `findNearestCity()`

## Automated Browser Testing

- Framework: Playwright (`@playwright/test`).
- Spec location: `tests/e2e/clock.spec.js`.
- Current smoke coverage:
- app load/runtime error check
- control toggles and debug dependencies
- zone add/remove flow
- local storage persistence across reloads
- persistence across browser restart
- geolocation-based local zone add flow
- sub-hour timezone dedupe precision
- compact sizing at small viewport
- dynamic tier transitions (`small` -> `xsmall`)
- desktop-shell contract flows for preset changes and UI visibility
- key accessibility hooks (`skip-link`, toolbar/list roles, live region)
- Run with: `npm run test:e2e`.
- Desktop-focused slice: `npm run test:e2e:desktop`.

## Automated Node Testing

- Framework: Jest.
- Unit tests: `tests/unit/*.jest.test.js`
- Integration tests: `tests/integration/*.integration.jest.test.js`
- Run with:
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:node`
- Combined desktop stack: `npm run test:desktop`
- Static dev-host slice: `npm run test:dev-host`

## Automated Tauri Host Testing

- Framework: Rust unit tests via `cargo test`.
- Current host coverage:
- desktop preference defaults and normalization
- shared preset loading and fallback bounds
- nearest-preset snap rules
- work-area fitting, including oversized-window edge cases
- Run with: `npm run test:tauri`.
- Native Windows smoke harness: `npm run test:tauri:smoke`.

## Automated Dev-Host Testing

- Framework: Jest against `scripts/serve-static.cjs`.
- Current coverage:
- root request resolution to `index.html`
- static file serving and MIME selection
- traversal rejection outside the repo root
- clear failure when the dev port is already in use
- Run with: `npm run test:dev-host`.

## Rendering Pipeline (Per Frame)

```
draw()
|- clear canvas
|- drawFace()
|- dedupe zones
|- draw timezone hour hands
|- draw shared minute/second hands
|- updateZoneBarTimes()
`- updateScreenReader()
```

## State Model

- `zones`: Source of truth for active time zones.
- `isSmall`: Compact-rendering flag for small canvas sizes.
- `isXSmall`: Extra-small rendering flag.
- `viewportTier`: `medium | small | xsmall`.
- `lastSrUpdate`: Minute-level throttle for live region announcements.
- `localStorage`: Primary browser backing store for zones and persisted control toggles.
- `IndexedDB`: Fallback browser backing store when `localStorage` is unavailable.
- UI control state is read from DOM each frame.

## Compatibility Contracts

- DOM IDs/classes are a stable interface for JS selectors.
- Remove buttons rely on `window.removeZone` for inline handler compatibility.
- App still runs by opening `index.html` directly (no bundler/tooling).

## Theming and Accessibility

- Theme variables are defined in CSS and swapped by `prefers-color-scheme`.
- Motion behavior respects `prefers-reduced-motion`.
- Skip link, ARIA roles, and live region behavior are preserved.

## Timezone Precision

Timezone hand grouping now keys off the visible hour-hand position for the active face mode. That preserves distinct hands for sub-hour offsets such as `UTC+5:30`, keeps 24h-only collisions from merging into a 12h bucket, and stacks up to two bezel chips when two selected zones land on the same visible hand position.

## Migration Notes

What ports cleanly to other platforms:

- Clock geometry and hand-angle math
- Offset-aware timezone grouping and nearest-city lookup
- NOAA day/night logic
- City catalog and color palette
- Browser DOM/CSS behavior that can be hosted inside a thin shell without duplicating time logic

What is platform-specific:

- Control widgets
- Theming system hooks
- Settings persistence
- Tray/widget integration
- Frameless drag regions and window lifecycle
- Desktop packaging and installer behavior

Current Tauri spike boundary:

- Browser HTML/CSS/JS remains canonical and is loaded directly by Tauri
- Electron and Tauri now share the same window preset definitions from `desktop/window-presets.json`
- Tauri now handles the thin window host boundary plus tray-driven window visibility, UI visibility, always-on-top state, launch-on-startup, hide-on-close behavior, local host preference persistence, and preset snap/work-area fitting behavior
- Tauri host preferences currently live in a JSON file under the app config directory, separate from browser `localStorage` / IndexedDB state
- The main remaining Tauri parity work is broader desktop-host verification and any final cleanup needed before Electron removal
