# Rlack - Slack Clone

A comprehensive Slack clone with real-time messaging, file sharing, voice/video calls, and all modern collaboration features.

## Features

### Core Messaging
- ✅ Real-time messaging with WebSocket
- ✅ Public and private channels
- ✅ Direct messages
- ✅ Message threads
- ✅ Rich text formatting
- ✅ Emoji reactions
- ✅ Code snippets with syntax highlighting

### Communication
- 🎥 Voice and video calls
- 🖥️ Screen sharing
- 📁 File sharing and preview
- 🔍 Global search
- 📌 Message pinning
- ⏰ Reminders and scheduling

### Collaboration
- 👥 Workspaces and teams
- 🔒 Role-based permissions
- 🤖 Integrations and bots
- 📊 Analytics and insights
- 🎨 Custom themes
- 📱 Mobile responsive

## Architecture

```
rlack/
├── packages/
│   ├── backend/     # Node.js API server
│   ├── web/         # React web application
│   ├── desktop/     # Electron macOS app
│   └── shared/      # Shared utilities and types
├── docs/            # Documentation
└── scripts/         # Build and deployment scripts
```

## Quick Start

```bash
# Automated setup (recommended)
./scripts/setup.sh

# Or manual setup:
npm run install:all
npm run dev:all
```

### Individual Services
```bash
npm run dev:backend    # API server on :3001
npm run dev:web        # Web app on :3000
npm run dev:desktop    # Electron macOS app
```

### Building for Production
```bash
npm run build          # Build all packages
npm run dist:desktop   # Create macOS app installer
```

## Tech Stack

### Backend
- Node.js + Express
- Socket.io for real-time communication
- PostgreSQL with Prisma ORM
- JWT authentication
- AWS S3 for file storage

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Socket.io-client for real-time updates
- React Query for state management
- React Router for navigation

### Desktop
- Electron for cross-platform desktop app
- Shared React components with web app
- Native system integrations

## Development

Each package has its own README with specific setup instructions:
- [Backend Setup](./packages/backend/README.md)
- [Web App Setup](./packages/web/README.md)
- [Desktop App Setup](./packages/desktop/README.md)