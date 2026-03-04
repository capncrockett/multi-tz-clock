# Multi-Timezone Analog Clock

A single analog clock face with multiple hour hands, each representing a different time zone — labeled by city or timezone abbreviation.

## Concept
Unlike typical world clock apps that show N separate clock faces, this is **one clock face** with color-coded hour hands overlaid. At a glance you see the relative time difference between zones without scanning across multiple dials.

---

## Phase 1 — MVP (HTML/Canvas) ✅
**Goal:** Working prototype, zero dependencies, runs in any browser.

Shipped features:
- Single `index.html` (~800 lines) with inline CSS/JS, zero dependencies
- HTML5 Canvas clock face: tick marks, numerals (12h and 24h), center dot
- Up to 6 timezone hour hands in maximally distinct colors (red, blue, green, gold, purple, orange)
- Three label modes: hand-tip, bezel (inner rim + outer city name), or legend-only
- Shared UTC minute + second hands (seconds toggleable, hidden on small viewports)
- 31-city catalog covering all major UTC offsets with lat/lon for sunrise/sunset
- Add/remove zones via chip bar + dropdown, auto-color assignment
- Day/night shading on 24h face (NOAA sunrise/sunset algorithm)
- Zone bar chips with day/night background styling (cream/navy)
- Optional sun/moon emoji indicators on bezel labels
- Responsive: small viewport (<300px) hides ticks, shows even-only 24h numbers
- Light/dark theming via `prefers-color-scheme` CSS vars
- `prefers-reduced-motion` support (throttled rAF)
- ADA: skip link, ARIA roles/labels, screen reader live region
- Bezel labels auto-flip between 3 and 9 o'clock for readability

Not shipped (deferred):
- Local storage persistence for user config
- Geolocation-based local timezone detection

---

## Phase 2 — POC Desktop App
**Goal:** Wrap the MVP into a standalone desktop window that behaves like a widget.

**Option A — Electron (cross-platform fast path)**
- Minimal Electron shell around the existing HTML/Canvas
- Frameless, always-on-top, transparent background
- Draggable, resizable
- System tray icon to toggle visibility
- Auto-launch on startup

**Option B — Tauri (lighter alternative)**
- Same web frontend, Rust backend
- Much smaller binary (~5-10 MB vs ~150 MB Electron)
- Native OS integration (tray, autostart)

**Decide after MVP based on:**
- Bundle size tolerance
- Whether we need any native OS APIs beyond tray/autostart

---

## Phase 3 — Windows Native Widget
**Goal:** True Windows widget experience.

- Windows Widgets Board (Win11) using Adaptive Cards + Web tech
- Or: WinUI 3 / WPF app with borderless overlay window
- Taskbar/system tray integration
- Settings stored in AppData
- Optional installer (MSIX or Inno Setup)

---

## Phase 4 — macOS & iOS
**Goal:** Bring the clock to Apple platforms.

**macOS:**
- SwiftUI + WidgetKit for Notification Center widget
- Standalone menu bar app as alternative (clock in menu bar dropdown)
- Canvas-equivalent: SwiftUI `Canvas` view or Core Graphics

**iOS:**
- WidgetKit (small / medium / large widget sizes)
- Static snapshots (WidgetKit limitation — no live animation)
- Tap widget → opens companion app with full animated clock
- Companion app: SwiftUI with same drawing logic

**Requires:** Mac with Xcode, Apple Developer account ($99/yr for App Store)

---

## Phase 5 — Android (Optional)
**Goal:** Cover the remaining major platform.

- Jetpack Compose + Canvas API
- Android home screen widget (AppWidgetProvider)
- Same static-snapshot constraint as iOS widgets

---

## Design Decisions
- **Max 6 timezone hands** (one per color). Zones sharing the same 12h hour are deduped into one hand with a combined label.
- **Single unified UTC minute/second hands.** Minutes align across all TZs. Seconds are togglable and hidden on small screens.
- **Three label modes** shipped: (a) floating box at hand tip, (b) bezel — TZ abbreviation on inner rim + city name on outer ring, (c) legend-only (zone bar chips only).
- **Day/night uses real solar data.** NOAA algorithm with lat/lon from CITY_CATALOG; fallback to 6am-6pm for unknown zones.
- **TZ abbreviations** use `Intl.DateTimeFormat` with a hardcoded fallback map for browsers that return `GMT+N`.
- **Bezel labels flip** at 3 and 9 o'clock so text is always right-side-up.
- **Zone bar** uses full DOM rebuild on add/remove but lightweight text-only patches each frame.

---

## Tech Stack Summary

| Phase | Platform | Tech |
|-------|----------|------|
| 1 | Browser | HTML + Canvas + vanilla JS |
| 2 | Desktop | Electron or Tauri |
| 3 | Windows | WinUI 3 / Widgets Board |
| 4 | Apple | SwiftUI + WidgetKit |
| 5 | Android | Jetpack Compose |
