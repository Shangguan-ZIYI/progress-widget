# Progress Widget

A lightweight desktop widget for tracking monthly and yearly goals without leaving your current workspace.

Built with Electron, the widget stays available above other windows, saves progress locally, and provides quick updates through a compact interface, system tray controls, and global shortcuts.

## Features

- Tracks monthly and yearly progress in one desktop widget
- Automatically applies monthly changes to the yearly total
- Stores recent actions for undo and keeps completed monthly records in an archive
- Persists progress, preferences, and window position between sessions
- Supports always-on-top, click-through, opacity, and position-lock settings
- Expands on hover and stays out of the taskbar when minimized to the system tray
- Prevents duplicate app instances
- Builds for Windows, macOS, and Linux through GitHub Actions

## Tech Stack

- Electron 28
- JavaScript, HTML, and CSS
- Electron IPC with context isolation
- electron-builder
- GitHub Actions

## Architecture

```text
Electron main process
├── Window, tray, and shortcut management
├── Persistent state manager
└── IPC handlers
    └── Isolated preload bridge
        └── Renderer interface
```

The renderer does not receive direct Node.js access. Electron runs with `nodeIntegration: false` and `contextIsolation: true`, while a preload bridge exposes the limited operations needed by the interface.

## Run Locally

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/Shangguan-ZIYI/progress-widget.git
cd progress-widget
npm install
npm start
```

## Build

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

The repository also includes a GitHub Actions workflow that builds platform-specific artifacts when a version tag matching `v*` is pushed or the workflow is started manually.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Shift + P` | Show or hide the widget |
| `Ctrl/Cmd + Shift + T` | Toggle click-through mode |

## Author

**Jay Da**  
M.S. Computer Science, Northeastern University  
[jayda@globalbiocaretech.com](mailto:jayda@globalbiocaretech.com)

## License

MIT
