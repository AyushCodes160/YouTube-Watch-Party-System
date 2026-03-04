# YouTube Watch Party System

A clean, production-ready Watch Party system featuring real-time synchronization and authoritative Role-Based Access Control (RBAC).

## Live URLs

- **Frontend**: `https://youtube-watch-party-ui.vercel.app` (Placeholder)
- **Backend (WSS)**: `https://youtube-watch-party-api.onrender.com` (Placeholder)

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Video Integration**: Official YouTube IFrame Player API

## Architecture Explanation

This system strictly separates concerns into a lightweight frontend client and an **Authoritative Backend Server**.

### The OOP Backend (Source of Truth)

The core of the server is built upon three primary classes:

- \`Participant\`: Tracks a user's Socket ID, username, and role (Host, Moderator, Participant).
- \`Room\`: The workhorse class. Maintains the centralized \`VideoState\`, a Map of participants, and **encapsulates all permission validation logic** using \`validatePermission()\`.
- \`RoomManager\`: Orchestrates room lifecycles, assigns unique IDs, and runs garbage collection routines to delete empty rooms gracefully.

### WebSocket Flow

The system leverages Socket.IO to manage low-latency TCP connections:

1. **Client → Server**: A user clicks Play. The frontend sends a \`play\` event payload: \`{ roomId, currentTime }\`.
2. **Authoritative Check**: The backend intercepts this event. It calls \`room.validatePermission(userId, 'play')\`.
3. **Server → Clients**: If the validation passes (e.g., the user is a Host/Moderator), the server updates its internal state and broadcasts a \`sync_state\` event to all sockets in the room.

### Role Validation & Security

The golden rule followed by this system is: **Never trust the frontend**.
If a malicious user modifies their local React state or invokes DevTools to forge a \`play\` WebSocket emission, the Node.js backend silently ignores the request because the user's role in the server's memory (\`Participant\`) is unauthorized. State mutations strictly occur on the backend first.

### YouTube State Handling Loop Prevention

To prevent infinite bounce loops where incoming \`sync_state\` events trigger the local YouTube player to seek, which in turn fires a new \`onStateChange\` back to the server, the frontend uses an \`isSyncing\` flag matrix. When a WebSocket event arrives, the flag is temporarily set to \`true\`, instructing the local player event listener to ignore the immediate secondary side-effects.

## Setup Instructions

### 1. Build & Run the Backend

```bash
cd server
npm install
npm run dev
# Server boots on http://localhost:3001
```

### 2. Build & Run the Frontend

```bash
# In an adjacent terminal root folder
npm install
npm run dev
# Frontend boots on http://localhost:8080
```

## Deployment Steps

1. Push the \`server\` directory to **Render**, specifying \`npm run build && npm start\` as the start commands. Configure \`ALLOWED_ORIGIN\` to your production frontend URL. Secure WSS connections are handled natively out of the box.
2. Push the root Vite directory to **Vercel** or **Render Static**, specifying \`VITE_BACKEND_URL\` as the new Render WebSocket server address.

## Trade-offs Made

- **No Persistent Database (MVP Scope)**: To optimize for real-time latency and demonstrate the core Watch Party networking fundamentals, PostgreSQL was omitted. Participant histories and abandoned rooms are cleared entirely from memory in a stateless architecture. A persistent DB could easily be attached to the \`RoomManager\` for auditing.
- **In-Memory Store Limits**: Managing rooms in the Node.js process \`Map\` prohibits horizontal scaling out of the box. To deploy across multiple Docker containers, a Redis adapter (\`@socket.io/redis-adapter\`) would be required to maintain pub/sub sync across different Node instances.
