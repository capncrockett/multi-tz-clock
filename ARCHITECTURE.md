# Architecture — Multi-TZ Clock (Phase 1)

This document is written for AI coding agents migrating this project to new platforms.

## File Layout
```
index.html      — Entire Phase 1 app (HTML + CSS + JS, ~800 lines, zero dependencies)
ROADMAP.md      — 5-phase plan: Browser → Electron/Tauri → Windows → macOS/iOS → Android
ARCHITECTURE.md — This file
README.md       — User-facing overview
```

## Single-File Structure (index.html)
The file has three sections in order:

1. **`<style>`** — CSS custom properties (light/dark), layout, zone bar chip styles, responsive breakpoints, accessibility helpers (.sr-only, .skip-link).
2. **`<body>` HTML** — Skip link, `#controls` toolbar (Labels select, Sec/24h/☀☾ checkboxes), `<canvas>`, screen reader live region, `#zone-bar`.
3. **`<script>`** — All JS, organized into labeled sections:

| Section | Key symbols | Purpose |
|---|---|---|
| CITY CATALOG | `CITY_CATALOG[]` | 31 cities with `{ label, tz, lat, lon }` |
| CONSTANTS | `HAND_COLORS[]`, `MAX_ZONES` | 6-color palette, max hand count |
| STATE | `zones[]`, `canvas`, `ctx`, `isSmall` | Mutable app state |
| SIZING | `resize()` | DPR-aware canvas sizing, sets `isSmall` flag |
| HELPERS | `getTimeInTZ()`, `getTzAbbrev()` | Time extraction, TZ abbreviation with fallback map |
| NOAA SUNRISE/SUNSET | `getSunTimes()`, `isDaytime()` | Solar position → sunrise/sunset hours (UTC) |
| ZONE DEDUP/SORT | `dedupeZones()`, `sortByTime()` | Merge same-hour zones, sort for display |
| ZONE BAR | `renderZoneBar()`, `updateZoneBarTimes()`, `addZone()`, `removeZone()` | DOM chips: full rebuild on change, text-only patch per frame |
| CLOCK FACE RENDERING | `drawDayNightFace()`, `drawPlainFace()`, `drawFace()` | Canvas face: 24h day/night or 12h plain |
| HAND DRAWING | `drawHand()`, `drawMinuteSecondHands()` | TZ hour hands + shared min/sec hands |
| SCREEN READER | `updateScreenReader()` | ARIA live region, updates once per minute |
| MAIN LOOP | `draw()` | `requestAnimationFrame` loop, orchestrates everything |

## Rendering Pipeline (per frame)
```
draw()
├── ctx.clearRect()
├── drawFace(cx, cy, r)
│   ├── drawDayNightFace() OR drawPlainFace()
│   ├── outer ring stroke
│   ├── tick marks (skip if isSmall)
│   ├── numerals (12 or 24, even-only if isSmall+24h)
│   └── center dot
├── for each deduped zone:
│   └── drawHand(cx, cy, r, hourAngle, ..., labelMode)
│       ├── hand line (solid color, drop shadow)
│       ├── if labelMode='tip': floating label box at hand tip
│       └── if labelMode='bezel': inner rim TZ abbrev + outer city name
├── drawMinuteSecondHands(cx, cy, r)
│   ├── minute hand (always visible)
│   ├── second hand (hidden if isSmall or checkbox off, smooth if no prefers-reduced-motion)
│   └── center cap dot
├── updateZoneBarTimes()    — patch chip text (no DOM rebuild)
└── updateScreenReader()    — once per minute
```

## State Model
- **`zones`** — Array of `{ label: string, tz: string, color: string }`. Drives everything. Modified by `addZone()`/`removeZone()`.
- **`isSmall`** — `true` when canvas CSS size < 300px. Triggers compact rendering mode.
- **`lastSrUpdate`** — Minute of last screen reader update (throttle to 1/min).
- **UI state** is read directly from DOM checkboxes/selects each frame (no shadow state).

## Theming
- CSS custom properties: `--bg`, `--bg-surface`, `--border`, `--text`, `--text-muted`, `--accent`.
- Two sets: dark (default) and light (`@media (prefers-color-scheme: light)`).
- `isLightMode()` helper reads the media query in JS for canvas drawing.
- Zone chips have hardcoded day/night colors (cream `#fdf6e3` / navy `#0d1321`) with light-mode overrides for the night style.

## Accessibility
- Skip link to zone bar.
- `role="toolbar"` on controls, `role="list"` / `role="listitem"` on zone bar.
- `aria-label` on canvas, selects, remove buttons.
- `aria-live="polite"` screen reader region updated once per minute.
- Focus outlines (`outline: 2px solid var(--accent)`).

## Key Constants
- **HAND_COLORS**: `['#e94560', '#4e9af1', '#2ecc71', '#e9b44c', '#9b59b6', '#e67e22']` (red, blue, green, gold, purple, orange)
- **MAX_ZONES**: `HAND_COLORS.length` (6)
- **CITY_CATALOG**: 31 entries. `lat`/`lon` feed `getSunTimes()`.
- **TZ_ABBREV_FALLBACK**: Map from IANA tz string to short abbreviation for browsers that return `GMT+N`.

## NOAA Algorithm
`getSunTimes(lat, lon)` implements a simplified NOAA solar position calculation:
- Input: lat/lon in degrees.
- Output: `{ sunrise, sunset }` in fractional UTC hours, OR `{ polarDay: true }` / `{ polarNight: true }`.
- Used by `isDaytime(tz)` which looks up the city in CITY_CATALOG. Falls back to 6am-18pm for unknown zones.

## Zone Bar Optimization
- `renderZoneBar()` — Full innerHTML rebuild. Only called on zone add/remove.
- `updateZoneBarTimes()` — Per-frame. Queries existing `.zone-time` elements, compares textContent, patches only if changed. No DOM creation.

## Responsive Behavior
When `isSmall` (canvas < 300px):
- No tick marks
- Numerals pushed to outer edge (replacing ticks)
- 24h mode shows even hours only
- Minute hand thinner (2px vs 3px)
- Second hand hidden entirely
- Tip labels use smaller font

## Migration Notes for Phase 2+
### What to extract
The rendering logic (everything in the DRAWING sections) is pure Canvas 2D API calls with no DOM dependencies. It can be ported to:
- **Electron/Tauri**: Use as-is (it's already web).
- **SwiftUI**: Translate `drawFace`/`drawHand`/`drawMinuteSecondHands` to SwiftUI `Canvas` view or Core Graphics `CGContext` calls. The math is identical.
- **Jetpack Compose**: Translate to `Canvas` composable with `DrawScope`.
- **WinUI 3**: Translate to `CanvasControl` (Win2D) or `DrawingVisual`.

### What changes per platform
- **Sizing**: Replace `window.innerWidth`/`resize()` with platform layout system.
- **Theming**: Replace CSS vars + `prefers-color-scheme` with platform theme APIs.
- **Controls**: Replace HTML controls with native UI (toggles, pickers).
- **Zone bar**: Replace HTML chips with native list/chip components.
- **Storage**: Replace (future) localStorage with platform storage (AppData, UserDefaults, SharedPreferences).
- **Tray/widget**: Platform-specific — see ROADMAP.md Phases 3-5.

### What stays the same
- `CITY_CATALOG` data (copy as-is to any language).
- `HAND_COLORS` palette.
- `TZ_ABBREV_FALLBACK` map.
- NOAA `getSunTimes` math (pure arithmetic, no API dependencies).
- Hour angle calculation: `(hVal / divisor) * 2π - π/2`.
- Dedup logic (merge same-hour zones).
- Bezel flip threshold: `angle > 0 && angle < π`.
