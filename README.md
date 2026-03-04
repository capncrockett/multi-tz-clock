# multi-tz-clock

A single analog clock face with multiple color-coded hour hands — one per time zone. At a glance, see the relative time difference between cities without scanning multiple dials.

## Quick Start

Open `index.html` in any modern browser. No build step, no dependencies.

## Features (Phase 1 MVP)

- **Up to 6 timezone hands** in distinct colors (red, blue, green, gold, purple, orange)
- **Three label modes**: hand-tip, bezel (inner abbreviation + outer city name), legend-only
- **12h / 24h toggle** — 24h face shows day/night shading using NOAA sunrise/sunset data
- **Add/remove zones** from a 31-city catalog covering all major UTC offsets
- **Responsive** — compact mode for small viewports (<300px)
- **Accessible** — skip link, ARIA roles, screen reader live region
- **Theming** — auto light/dark via `prefers-color-scheme`
- **Reduced motion** — respects `prefers-reduced-motion`

## Controls

- **Labels**: Select label display mode (tip / bezel / legend)
- **Sec**: Toggle second hand
- **24h**: Toggle 24-hour face with day/night shading
- **☀/☾**: Toggle sun/moon indicators on bezel labels

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical deep dive (written for AI agent handoff)
- [ROADMAP.md](ROADMAP.md) — 5-phase plan: Browser → Desktop → Windows → Apple → Android

## License

MIT
