# info_card_pwa
Progressive Web App

## Architecture plan
- Components: `App`, `InstallPrompt`, `OfflineBanner`, `UserCard`, `SkeletonCard`
- Data layer: `idb` schema with versioning + CRUD + queue + LWW conflict rule
- Service worker: Workbox via `vite-plugin-pwa` (precache app shell, cache-first static assets, SWR API)

## Screens and user flows
- Home: view card, install prompt, quick actions
- Card: edit details, save locally, sync on reconnect
- Settings: theme, export/import, reset, notifications
- Privacy: local-only data note

## Folder structure
```
public/
  api/
  icons/
src/
  components/
  data/
  hooks/
  pwa/
  screens/
  test/
tests/
  e2e/
```

## Scripts
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test:unit`
- `npm run test:e2e`

## Environment variables
VITE_API_BASE_URL=/api

## Install
npm install
npm run dev

## Build and preview
npm run build
npm run preview

## Test offline mode
1. Run `npm run build` and `npm run preview`.
2. Open the app once to register the service worker.
3. In DevTools > Network, enable Offline and reload.

## Verify installability
Run Lighthouse (PWA category) in Chrome DevTools and confirm:
- Manifest is detected
- Service worker is active
- Installable criteria passes

## iOS “Add to Home Screen”
1. Open the app in Safari.
2. Tap Share.
3. Tap “Add to Home Screen”.
4. Open the Home Screen icon once while online.
5. Then go offline and reopen from Home Screen.

Note: iOS Chrome shortcuts are bookmarks and do not install a PWA. Use Safari.

## Security and privacy
- No analytics or tracking.
- Local-only storage in IndexedDB.
- Use server proxy if API keys are needed.

## Tests
npm run test:unit
npm run test:e2e