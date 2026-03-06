# Multi-Timezone Analog Clock

A single analog clock face with multiple hour hands, each representing a different time zone and label.

## Concept

Unlike typical world clock apps that show multiple separate dials, this project overlays timezone hour hands on one face so relative offsets are visible immediately.

---

## Current Status

- Phase 1 browser MVP is complete and shipped in this repo.
- Phase 1.1 browser hardening is also complete:
  - architecture documentation
  - extracted pure layout helpers
  - Jest unit/integration coverage
  - Playwright browser smoke coverage
  - repo guard hooks and workflow scripts
- The deferred browser backlog is now closed:
  - local storage persistence is shipped
  - geolocation-based local timezone detection is shipped
  - sub-hour timezone precision edge-case handling is shipped
- Phase 2 desktop packaging is now in progress with an Electron proof of concept.
- Phase 3 through Phase 5 have not started yet.

---

## Phase 1 - MVP (HTML/Canvas) Complete

Goal: Working prototype, zero dependencies, runs in any browser.

Shipped:

- Browser app with one `index.html`
- Styles extracted to `assets/css/main.css`
- Runtime logic extracted to `assets/js/app.js`
- Canvas clock face with 12h and 24h modes
- Up to 6 timezone hour hands with distinct colors
- Three label modes (tip, bezel, legend-only)
- Shared UTC minute/second hands
- 31-city catalog with lat/lon for sunrise/sunset
- Add/remove zone workflow with chip bar
- Local storage persistence for zones and display toggles
- Local zone add action using geolocation with browser-timezone fallback
- Day/night shading using NOAA solar math
- Minute-accurate hand grouping for sub-hour offsets (for example +30 / +45)
- Responsive behavior for compact screens
- Light/dark theming and reduced-motion support
- Accessibility baseline (skip link, ARIA roles/labels, live region)

---

## Phase 1.1 - Browser Hardening Complete

Goal: Make the browser MVP easier to test, maintain, and port without changing the product direction.

Shipped:

- Architecture documentation for the browser codebase
- Pure clock layout helpers extracted to `assets/js/clock-utils.js`
- Jest unit tests for shared utility logic
- Jest integration tests for composed layout rules
- Playwright browser smoke tests
- Guard scripts and git hooks for stricter agent workflow

Non-goals:

- No desktop shell or native host work yet

---

## Phase 2 - POC Desktop App In Progress

Goal: Wrap the browser app into a desktop widget-style window.

Option A - Electron:

- Minimal shell around existing web frontend
- Frameless, always-on-top, transparent window
- Draggable/resizable behavior
- System tray integration
- Auto-launch on startup

Shipped in this checkpoint:

- Electron host bootstrapped around the existing browser UI
- Frameless transparent always-on-top window
- Desktop-only drag bar for moving the window
- Resizable shell window
- System tray menu with UI toggle, pin toggle, launch-on-startup toggle, and quit
- Desktop host preferences persisted locally under the Electron user-data directory
- Windows login startup wiring for the desktop app

Still pending in Phase 2:

- Packaging/distribution flow
- Decision on whether to stay on Electron or pivot to Tauri before Phase 2 is considered complete

Option B - Tauri:

- Same frontend with Rust host
- Smaller binary footprint
- Native tray/autostart integration

---

## Phase 3 - Windows Native Widget

Goal: Native Windows widget experience.

- Windows widget surface or WinUI-based host
- Taskbar/system tray integration
- Settings in AppData
- Installer packaging

---

## Phase 4 - macOS and iOS

Goal: Apple platform support.

- macOS menu-bar/widget options via SwiftUI/WidgetKit
- iOS WidgetKit snapshots + companion app for live animation

---

## Phase 5 - Android (Optional)

Goal: Android support.

- Jetpack Compose Canvas app
- Home screen widget support

---

## Design Decisions

- Max 6 timezone hands (one per color).
- Shared UTC minute/second hands.
- Three label modes are first-class UI behavior.
- NOAA-based day/night logic is retained.
- Browser launch remains no-build and dependency-free.
- Minute-accurate timezone hand grouping is preserved as browser behavior to carry into later platform ports.

---

## Tech Stack Summary

| Phase | Platform | Tech |
|-------|----------|------|
| 1 | Browser | HTML + Canvas + vanilla JS/CSS |
| 2 | Desktop | Electron or Tauri |
| 3 | Windows | WinUI / widget surface |
| 4 | Apple | SwiftUI + WidgetKit |
| 5 | Android | Jetpack Compose |
