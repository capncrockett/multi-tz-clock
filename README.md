# multi-tz-clock

A single analog clock face with multiple color-coded hour hands, one per time zone. At a glance, see relative time differences between cities without scanning multiple dials.

## Quick Start

Open `index.html` in any modern browser. No build step, no dependencies.

## Automated Testing (Playwright)

Install dependencies and browser once:

```bash
npm install
npx playwright install chromium
```

Run the end-to-end smoke suite:

```bash
npm run test:e2e
```

Useful variants:

- `npm run test:e2e:headed` - run tests with a visible browser
- `npm run test:e2e:ui` - open Playwright UI mode
- `npm run test:e2e:report` - open the latest HTML report

## File Layout (Phase 1.1)

- `index.html` - Markup and UI structure
- `assets/css/main.css` - App styles and responsive/theming rules
- `assets/js/app.js` - App logic, rendering, time math, and interactions
- `ARCHITECTURE.md` - Technical deep dive for engineering handoff
- `ROADMAP.md` - Multi-phase platform plan

## Features (Phase 1 MVP)

- Up to 6 timezone hands in distinct colors
- Bezel labels with optional TZ/city text switch, or legend-only mode
- 12h / 24h toggle
- 24h face day/night shading via NOAA sunrise/sunset math
- Add/remove zones from a 31-city catalog
- Responsive compact mode for small viewports
- Accessible controls, skip link, and live region updates
- Light/dark theme support via `prefers-color-scheme`
- Reduced motion support via `prefers-reduced-motion`

## Important Note on Timezone Precision

Phase 1.1 intentionally keeps existing hour-hand behavior and does not yet implement special rendering for sub-hour timezone offsets (for example +30 or +45 minute offsets). This is a deferred stretch goal for later phases.

## Controls

- `Bezel`: show/hide inner bezel labels
- `Sec`: second-hand toggle
- `24h`: 24-hour face toggle
- `City`: switches bezel text between TZ abbreviation and city name (disabled when Bezel is off)

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [ROADMAP.md](ROADMAP.md)

## License

MIT
