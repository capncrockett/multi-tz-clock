# Desktop Release Checklist

Use this checklist for the final human pass before calling Phase 2 desktop release-ready.

## Preconditions

Run the automated proof first on Windows:

```bash
npm run test:desktop:proof
```

Then launch the desktop host:

```bash
npm run desktop:dev
```

## Manual Pass

Target time: under 30 seconds.

1. Confirm the app opens in clock-only mode with no unexpected browser-only chrome visible.
2. Left-click the tray icon once and confirm the window hides without quitting the app.
3. Left-click the tray icon again and confirm the same window restores visibly on screen.
4. Close the restored window with the native close button and confirm the app stays alive in the tray.
5. Left-click the tray icon again and confirm the window restores after the close-to-tray cycle.
6. Open the tray menu and confirm `Show UI` restores the full controls and zone bar.
7. Drag the window by the desktop drag bar and confirm the frameless transparent window still feels visually clean on the desktop.
8. Use the tray `Quit` action and confirm the process exits cleanly.

## Acceptance

- No duplicate windows appear during hide/restore cycles.
- Tray hide/restore works both before and after a close-to-tray action.
- The restored window remains interactive and focused enough to continue using immediately.
- The transparent frameless shell still looks intentional on the current Windows desktop.
