# Architecture - Multi-TZ Clock (Phase 1.1)

This document is written for AI coding agents and engineers migrating this project across platforms.

## File Layout

```
index.html           - App shell markup and DOM structure
assets/css/main.css  - All styles (theme vars, layout, accessibility, responsive rules)
assets/js/clock-utils.js - Shared pure layout/tier helpers (browser + Node)
assets/js/app.js     - All runtime logic (state, time math, rendering, interactions)
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
2. External stylesheet reference: `assets/css/main.css`.
3. UI structure in `<body>`:
- Skip link
- `#controls` toolbar
- `<canvas id="clock">`
- `#sr-times` live region
- `#zone-bar`
4. External script references (both `defer`):
- `assets/js/clock-utils.js`
- `assets/js/app.js`

### `assets/css/main.css`
Contains:

1. Theme variables and light-mode overrides.
2. Layout and typography for controls, canvas, and zone chips.
3. Accessibility helpers (`.skip-link`, `.sr-only`, focus states).
4. Responsive adjustments for narrow screens.

### `assets/js/app.js`
Contains these logical sections:

- CITY CATALOG: `CITY_CATALOG[]`
- CONSTANTS: `HAND_COLORS[]`, `MAX_ZONES`
- STATE: `zones[]`, canvas context, viewport flags
- SIZING: `resize()`
- HELPERS: `getTimeInTZ()`, `getTzAbbrev()`
- NOAA SUNRISE/SUNSET: `getSunTimes()`, `isDaytime()`
- DEDUPE/SORT: `dedupeZones()`, `sortByTime()`
- ZONE BAR: `renderZoneBar()`, `updateZoneBarTimes()`, `addZone()`, `removeZone()`
- DRAWING: `drawDayNightFace()`, `drawPlainFace()`, `drawFace()`, `drawHand()`, `drawMinuteSecondHands()`
- ACCESSIBILITY: `updateScreenReader()`
- MAIN LOOP: `draw()`

### `assets/js/clock-utils.js`
Contains pure functions used by both browser runtime and Jest tests:

- `deriveViewportFlags()`
- `is24hNumeralVisible()`, `is12hNumeralVisible()`
- `get24hNumeralStyle()`, `get12hNumeralStyle()`
- `getBezelLabelLayout()`

## Automated Browser Testing

- Framework: Playwright (`@playwright/test`).
- Spec location: `tests/e2e/clock.spec.js`.
- Current smoke coverage:
- app load/runtime error check
- control toggles and debug dependencies
- zone add/remove flow
- compact sizing at small viewport
- dynamic tier transitions (`small` -> `xsmall`)
- key accessibility hooks (`skip-link`, toolbar/list roles, live region)
- Run with: `npm run test:e2e`.

## Automated Node Testing

- Framework: Jest.
- Unit tests: `tests/unit/*.jest.test.js`
- Integration tests: `tests/integration/*.integration.jest.test.js`
- Run with:
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:node`

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
- UI control state is read from DOM each frame.

## Compatibility Contracts

- DOM IDs/classes are a stable interface for JS selectors.
- Remove buttons rely on `window.removeZone` for inline handler compatibility.
- App still runs by opening `index.html` directly (no bundler/tooling).

## Theming and Accessibility

- Theme variables are defined in CSS and swapped by `prefers-color-scheme`.
- Motion behavior respects `prefers-reduced-motion`.
- Skip link, ARIA roles, and live region behavior are preserved.

## Deferred Edge Case

Sub-hour timezone precision (for example, +30 or +45 minute offset-specific hour-hand treatment) is deferred. Phase 1.1 extraction preserves existing behavior intentionally and does not change hand math.

## Migration Notes

What ports cleanly to other platforms:

- Clock geometry and hand-angle math
- NOAA day/night logic
- City catalog and color palette

What is platform-specific:

- Control widgets
- Theming system hooks
- Settings persistence
- Tray/widget integration
