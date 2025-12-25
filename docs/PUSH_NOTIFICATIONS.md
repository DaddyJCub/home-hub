# Push Notifications – HomeHub

This project uses client-side notifications with service workers. There is no external push gateway by default; test pushes use the registered service worker to display notifications locally.

## How it works
- Notification permission is requested in the browser/PWA.
- Subscriptions are stored locally (`localStorage: push-subscriptions`) and marked active/revoked; nothing is sent to a server.
- The service worker (`public/sw.js`) listens for `push` events (for future Web Push payloads) and `notificationclick` to focus/open the app.
- Test pushes and in-app reminders use `registration.showNotification` to ensure they work in PWA mode and on iOS where supported.

## Setup
1. Ensure service worker is registered (PWA Diagnostics card in Settings should show it).
2. Grant notification permission in the browser.
3. In Settings → Push Diagnostics:
   - Tap “Subscribe”
   - Tap “Send test push”
4. You should see a notification. If it fails, check the last result message.

## Payload format (for future Web Push)
The service worker accepts JSON payloads on `push`:
```json
{
  "title": "HomeHub",
  "body": "You have a new reminder",
  "icon": "/icon-192.png",
  "badge": "/icon-192.png",
  "tag": "optional-tag",
  "data": { "url": "/?tab=chores" }
}
```
`notificationclick` will focus an existing client at `data.url` or open it if not present.

## Endpoints / API
There is no backend push API in this repo. Subscriptions are local and test pushes are generated client-side. If you add a push backend later, POST the subscription object and use VAPID/FCM to deliver payloads matching the format above.

## iOS PWA notes
- iOS 16.4+ supports web push for PWAs; ensure the site is installed to home screen.
- Permission must be granted after installation; diagnostics will still show permission state.
- Notification clicks open/focus the PWA via the service worker handler.

## Troubleshooting
- “Notification permission denied”: re-enable in browser/site settings.
- “Service worker not available”: ensure the PWA is installed or the page is served over HTTPS/localhost.
- No notification shown: verify permission is granted and try “Force SW update” in PWA Diagnostics, then reload.
- Cached SW: unregister and reinstall PWA to pick up the latest `sw.js`.
