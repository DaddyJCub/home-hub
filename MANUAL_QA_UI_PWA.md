# Manual QA – UI & PWA

Quick checks to run after UI/PWA changes.

## Desktop layout
- Open the dashboard at `/?tab=dashboard`; verify max width is centered, nav tabs are visible, and cards have breathing room (no collisions).
- Check Chores and Settings tabs: headings have space, cards have radius/shadow, and text doesn’t overlap.
- Resize to tablet (~900px) and confirm the tab list stays readable with scrollable pills.

## Mobile layout
- Set viewport to ~390px or use a phone; bottom nav should appear and remain sticky.
- Cards stack with 12–16px gaps; tap targets (buttons, switches) are easy to hit.
- Pull-to-refresh and swipe gestures still work.

## PWA install (Chrome)
- Visit the site over HTTPS (or localhost) and confirm the install prompt is available.
- Check DevTools > Application > Manifest: all required fields present, icons load (192/512, maskable).
- Install the app; launch in standalone. Display mode should show “standalone” in PWA Diagnostics.

## Service worker
- DevTools > Application > Service Workers: registered `sw.js`, active and controlling.
- Click “Update” and confirm it activates; page reloads if update applies.
- Toggle offline and reload: offline page renders, then returns to app when back online.

## PWA Diagnostics card
- In Settings, open “PWA Diagnostics” and confirm:
  - Manifest detected = Yes
  - SW registered/controlling = Yes
  - Display mode reflects browser vs standalone
  - Notification permission state matches browser
- Use “Force SW update” then reload to confirm update path works.
