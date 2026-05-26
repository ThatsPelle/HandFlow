# HandFlow Companion

Portable Windows desktop shell for HandFlow.

## Behavior

- Listens on `ws://127.0.0.1:47630/handflow`.
- Serves embedded HandFlow web UI on `http://127.0.0.1:47631/`.
- Receives normalized pointer commands from HandFlow.
- Uses Win32 `SendInput` for move, click, and drag.
- Hosts WebView2 desktop window.
- `Ctrl+Alt+H` toggles enabled/paused.

## Build

```powershell
npm run desktop:publish
```

Output:

`release\HandFlow-win-x64\HandFlow.Companion.exe`
