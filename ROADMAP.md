# Multi-Timezone Analog Clock

A single analog clock face with multiple hour hands, each representing a different time zone — labeled by city or timezone abbreviation.

## Concept
Unlike typical world clock apps that show N separate clock faces, this is **one clock face** with color-coded hour hands overlaid. At a glance you see the relative time difference between zones without scanning across multiple dials.

---

## Phase 1 — MVP (HTML/Canvas)
**Goal:** Working prototype, zero dependencies, runs in any browser.

- Single `index.html` file with inline CSS/JS
- HTML5 Canvas draws the clock face (tick marks, numerals)
- Multiple hour hands rendered in distinct colors
- Each hand labeled with city name or TZ abbreviation (e.g. "NYC / EST")
- Minute hand + second hand for local time only (to reduce clutter)
- Hardcoded default set of timezones (configurable in source)
- Smooth animation via `requestAnimationFrame`

**Stretch:**
- Simple config UI (add/remove zones, pick colors)
- Local storage persistence for user config
- Light/dark theme toggle

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

## Open Questions
- How many timezone hands before it gets unreadable? Probably cap at 5-6.
- Should the minute/second hands belong to local time or a "primary" zone?
- Hand label placement — arc along the hand? Legend/key outside the face?
- Do we want a digital readout alongside each hand (small text near the tip)?

---

## Tech Stack Summary

| Phase | Platform | Tech |
|-------|----------|------|
| 1 | Browser | HTML + Canvas + vanilla JS |
| 2 | Desktop | Electron or Tauri |
| 3 | Windows | WinUI 3 / Widgets Board |
| 4 | Apple | SwiftUI + WidgetKit |
| 5 | Android | Jetpack Compose |
