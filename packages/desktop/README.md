# Rlack Desktop

Native macOS desktop application built with Electron, sharing React components with the web app.

## Features

### Native macOS Integration
- 🖥️ Native window management with macOS title bar
- 📱 System notifications
- 🎯 Dock integration and app icon
- ⌨️ Native keyboard shortcuts
- 📁 File dialogs and system integrations
- 🔗 Deep linking support (rlack:// protocol)

### Desktop-Specific Features
- 💾 Persistent local storage
- 🔄 Auto-updater support
- 🎨 Dark mode support
- 📖 Context menus
- 🚀 Fast native performance
- 📱 Offline support

### Shared with Web App
- 🔐 Authentication system
- 💬 Real-time messaging
- 📁 File sharing
- 🎥 Voice/video calls
- 👥 Workspace management

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist:mac
```

## Architecture

```
packages/desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Main process entry
│   │   ├── preload.ts  # Preload script
│   │   └── util.ts     # Utilities
│   └── renderer/       # React renderer process
│       ├── app.tsx     # App entry point
│       ├── DesktopApp.tsx
│       ├── components/ # Desktop-specific components
│       ├── store/      # State management (symlinked from web)
│       ├── lib/        # Utilities (symlinked from web)
│       └── types/      # Type definitions (symlinked from web)
├── assets/             # Icons and entitlements
└── dist/               # Build output
```

## Scripts

- `npm run dev` - Start development with hot reload
- `npm run build` - Build for production
- `npm run pack` - Package without distribution
- `npm run dist` - Create distributable packages
- `npm run dist:mac` - Create macOS-specific packages

## Building for Distribution

### Prerequisites
- macOS for building macOS apps
- Xcode Command Line Tools
- Apple Developer account (for signing)

### Build Commands
```bash
# Development build
npm run pack

# Production build with auto-updater
npm run dist:mac
```

### Auto-Updates
The app supports automatic updates using `electron-updater`. Configure your update server URL in the build configuration.

## Security

The app follows Electron security best practices:
- Context isolation enabled
- Node integration disabled in renderer
- Preload script for secure IPC
- CSP headers configured
- External URL handling

## Native Integrations

### Notifications
```typescript
const { showNotification } = useDesktopStore();
showNotification('New Message', 'You have a new message from John');
```

### File Dialogs
```typescript
const result = await window.electron.dialog.showOpenDialog({
  properties: ['openFile'],
  filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
});
```

### Menu Integration
Desktop app includes native macOS menu bar with keyboard shortcuts:
- `Cmd+N` - New Workspace
- `Cmd+Shift+N` - New Channel  
- `Cmd+,` - Preferences
- `Cmd+Shift+S` - Toggle Sidebar

## Deep Linking

The app registers the `rlack://` protocol for deep linking:
```
rlack://workspace/team-name/channel/general
```