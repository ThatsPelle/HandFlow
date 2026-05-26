# HandFlow

HandFlow is a local-first React, TypeScript, Vite, TailwindCSS, Framer Motion, and MediaPipe foundation for realtime webcam hand tracking interfaces.

## Architecture

- `src/pages` composes the primary app surface.
- `src/components` contains reusable layout, HUD, panel, and webcam stage UI.
- `src/hooks` isolates React lifecycle bindings for webcam and overlay rendering.
- `src/services` owns browser-native webcam access, canvas rendering, MediaPipe hand tracking, and the future gesture preparation boundary.
- `src/types` keeps shared telemetry and tracking contracts.
- `src/utils` contains small pure helpers used by UI and services.

## Local-First Posture

Webcam frames are captured with browser APIs and remain on the user device. MediaPipe WASM and the hand landmarker model are served from `public/mediapipe`, so runtime hand tracking does not need a backend, cloud processing, server-side webcam handling, or external AI API integration.

## Commands

```bash
npm run dev
npm test
npm run lint
npm run build
npm run desktop:publish
```

## Desktop App

HandFlow ships as a local-first Windows desktop app. The embedded web UI, webcam capture, MediaPipe inference, and native pointer bridge all run on the same device.

- Build with `npm run desktop:publish`.
- Launch `dist-desktop/HandFlow/HandFlow.Companion.exe`.
- Choose webcam, press `Start`, then enable the mouse-pointer button in the bottom dock.
- Open palm moves the OS pointer.
- Pinch down starts click/drag.
- Releasing pinch sends mouse up.
- `Ctrl+Alt+H` pauses/resumes pointer control.

No webcam frame leaves the device. Browser runtime only sends local WebSocket commands to `127.0.0.1:47630`; desktop shell performs Win32 pointer input.

## GitHub Hygiene

- Do not commit `dist/`, `dist-desktop/`, `node_modules/`, `companion/**/bin/`, `companion/**/obj/`, or `*.WebView2/`.
- Publish binaries through GitHub Releases, not git history.
