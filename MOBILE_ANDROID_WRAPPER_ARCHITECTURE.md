# Android Wrapper Architecture (Capacitor + SaaS URL)

## Overview
- Android app is a Capacitor native shell.
- Web app is loaded from the production SaaS URL (`CAP_SERVER_URL` or `https://app.mysaas.com`).
- Backend provides `/api/app-version` and emits `new_app_version` over Socket.IO.
- Mobile client polls version endpoint and listens for socket update events to auto-refresh.

## Implemented Components
- Capacitor server URL remote-loading config.
- Version endpoint: `GET /api/app-version`.
- Deployment event endpoint: `POST /api/app-version/notify` (optional token: `APP_VERSION_NOTIFY_TOKEN`).
- Socket.IO version event: `new_app_version`.
- Frontend hook: `useAppAutoUpdate()` integrated in `App.jsx`.
- Access token persistence across reloads in `tokenStore.js` via `sessionStorage`.

## Production Workflow
1. Deploy frontend to your SaaS domain.
2. Deploy backend with updated `APP_VERSION` / `BUILD_TIME` env vars.
3. Optionally call `POST /api/app-version/notify` from CI/CD to force realtime refresh.
4. Build Android APK when native-layer changes are required.

## Build Commands
```bash
npm run build --prefix frontend
npx cap sync android
cd android
gradlew assembleDebug
gradlew assembleRelease
```
