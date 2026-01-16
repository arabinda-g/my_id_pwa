# info_card_pwa
Progressive Web App

## Install

```bash
npm install
npm run dev
```

## Build and preview

```bash
npm run build
npm run preview
```

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

## Tests

```bash
npm run test:unit
npm run test:e2e
```