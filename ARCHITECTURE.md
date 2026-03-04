# YouTube Watch Party — Architecture Documentation

> Comprehensive system architecture for deploying a production-grade YouTube Watch Party platform with a dedicated Node.js/Socket.IO WebSocket backend.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [OOP Design — Room Management](#oop-design)
4. [WebSocket Event Protocol](#websocket-event-protocol)
5. [Permission Matrix & Backend Validation](#permission-matrix)
6. [YouTube IFrame Integration](#youtube-iframe-integration)
7. [Scalability Design](#scalability-design)
8. [Deployment Guide](#deployment-guide)
9. [Security Considerations](#security-considerations)
10. [Bonus Architecture](#bonus-architecture)
11. [Event Flow Walkthrough](#event-flow-walkthrough)
12. [Trade-offs & Decisions](#trade-offs)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Browser  │  │ Browser  │  │ Browser  │  │ Browser  │    │
│  │ React +  │  │ React +  │  │ React +  │  │ React +  │    │
│  │ YT Player│  │ YT Player│  │ YT Player│  │ YT Player│    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │              │          │
│       └──────────────┴──────┬───────┴──────────────┘          │
│                             │ WebSocket (Socket.IO)           │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER (Nginx)                      │
│              Sticky Sessions (socket.io sid)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Node.js     │ │  Node.js     │ │  Node.js     │
│  Instance 1  │ │  Instance 2  │ │  Instance 3  │
│  Socket.IO   │ │  Socket.IO   │ │  Socket.IO   │
│  + Express   │ │  + Express   │ │  + Express   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   Redis Cluster   │
              │   Pub/Sub +       │
              │   Session Store   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   PostgreSQL      │
              │   (Supabase)      │
              │   Auth + Data     │
              └──────────────────┘
```

### Why WebSockets over Polling?

| Aspect           | Polling                    | WebSockets              |
| ---------------- | -------------------------- | ----------------------- |
| Latency          | 1-5s (poll interval)       | ~50ms                   |
| Server load      | O(n) requests/interval     | 1 persistent connection |
| Bandwidth        | HTTP headers every request | Framing overhead only   |
| Bi-directional   | No (client-initiated only) | Yes                     |
| Real-time events | Simulated                  | Native                  |

WebSockets maintain a persistent TCP connection with minimal overhead. For video sync where 50ms matters, polling is unacceptable.

---

## 2. OOP Design — Room Management

### Class: `Participant`

```typescript
export class Participant {
  constructor(
    public readonly id: string,
    public readonly socketId: string,
    public username: string,
    public role: "host" | "moderator" | "participant",
  ) {}

  canControl(): boolean {
    return this.role === "host" || this.role === "moderator";
  }

  canManageRoles(): boolean {
    return this.role === "host";
  }

  canRemoveParticipants(): boolean {
    return this.role === "host";
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      role: this.role,
      online: true,
    };
  }
}
```

### Class: `Room`

```typescript
import { Server } from "socket.io";

interface VideoState {
  state: "playing" | "paused" | "buffering";
  currentTime: number;
  videoId?: string;
  updatedAt: number;
}

export class Room {
  public participants: Map<string, Participant> = new Map();
  public videoState: VideoState = {
    state: "paused",
    currentTime: 0,
    updatedAt: Date.now(),
  };
  public createdAt: Date = new Date();

  constructor(
    public readonly id: string,
    public hostId: string,
    private io: Server,
  ) {}

  addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant);
    // Join Socket.IO room
    const socket = this.io.sockets.sockets.get(participant.socketId);
    socket?.join(this.id);
    // Notify others
    this.broadcast("user_joined", participant.toJSON(), participant.id);
    // Send current state to joiner
    socket?.emit("sync_state", {
      videoState: this.videoState,
      participants: this.getParticipantList(),
    });
  }

  removeParticipant(userId: string): void {
    const participant = this.participants.get(userId);
    if (!participant) return;

    const socket = this.io.sockets.sockets.get(participant.socketId);
    socket?.leave(this.id);
    this.participants.delete(userId);
    this.broadcast("user_left", { user_id: userId });
  }

  validatePermission(userId: string, action: string): boolean {
    const participant = this.participants.get(userId);
    if (!participant) return false;

    const controlActions = ["play", "pause", "seek", "change_video"];
    const roleActions = ["assign_role"];
    const hostActions = ["remove_participant", "transfer_host"];

    if (controlActions.includes(action)) return participant.canControl();
    if (roleActions.includes(action)) return participant.canManageRoles();
    if (hostActions.includes(action)) return participant.role === "host";

    return false;
  }

  updateVideoState(newState: Partial<VideoState>): void {
    this.videoState = {
      ...this.videoState,
      ...newState,
      updatedAt: Date.now(),
    };
  }

  assignRole(targetId: string, newRole: "moderator" | "participant"): boolean {
    const target = this.participants.get(targetId);
    if (!target || target.role === "host") return false;
    target.role = newRole;
    this.broadcast("role_assigned", { user_id: targetId, role: newRole });
    return true;
  }

  broadcast(event: string, data: any, excludeUserId?: string): void {
    if (excludeUserId) {
      const excludeParticipant = this.participants.get(excludeUserId);
      if (excludeParticipant) {
        const socket = this.io.sockets.sockets.get(excludeParticipant.socketId);
        socket?.to(this.id).emit(event, data);
        return;
      }
    }
    this.io.to(this.id).emit(event, data);
  }

  getParticipantList() {
    return Array.from(this.participants.values()).map((p) => p.toJSON());
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }
}
```

### Class: `RoomManager`

```typescript
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private io: Server) {
    // Clean up empty rooms every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  createRoom(id: string, hostId: string): Room {
    const room = new Room(id, hostId, this.io);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  deleteRoom(id: string): void {
    this.rooms.delete(id);
  }

  private cleanup(): void {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty()) {
        this.rooms.delete(id);
        console.log(`[RoomManager] Cleaned up empty room: ${id}`);
      }
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
```

---

## 3. WebSocket Event Protocol

### Client → Server Events

| Event                | Payload                          | Required Role     |
| -------------------- | -------------------------------- | ----------------- |
| `join_room`          | `{ roomId, token }`              | Any authenticated |
| `leave_room`         | `{ roomId }`                     | Any participant   |
| `play`               | `{ roomId, currentTime }`        | Host / Moderator  |
| `pause`              | `{ roomId, currentTime }`        | Host / Moderator  |
| `seek`               | `{ roomId, currentTime }`        | Host / Moderator  |
| `change_video`       | `{ roomId, videoId }`            | Host / Moderator  |
| `assign_role`        | `{ roomId, targetUserId, role }` | Host              |
| `remove_participant` | `{ roomId, targetUserId }`       | Host              |

### Server → Client Events

| Event                 | Payload                                      | Recipients        |
| --------------------- | -------------------------------------------- | ----------------- |
| `sync_state`          | `{ videoState, participants }`               | Joining user      |
| `video_action`        | `{ state, currentTime, videoId, updatedAt }` | All in room       |
| `user_joined`         | `{ id, username, role }`                     | All except joiner |
| `user_left`           | `{ user_id }`                                | All in room       |
| `role_assigned`       | `{ user_id, role }`                          | All in room       |
| `participant_removed` | `{ user_id }`                                | All in room       |
| `error`               | `{ code, message }`                          | Triggering user   |

### Event Lifecycle

```
Client Action → Socket.IO emit → Server receives →
  1. Validate authentication (JWT)
  2. Validate room membership
  3. Validate role permission
  4. Update room state
  5. Broadcast to room
  6. Persist to database (async)
```

---

## 4. Permission Matrix & Backend Validation

```
┌──────────────────────┬──────┬───────────┬─────────────┐
│ Action               │ Host │ Moderator │ Participant │
├──────────────────────┼──────┼───────────┼─────────────┤
│ Play                 │  ✓   │     ✓     │      ✗      │
│ Pause                │  ✓   │     ✓     │      ✗      │
│ Seek                 │  ✓   │     ✓     │      ✗      │
│ Change Video         │  ✓   │     ✓     │      ✗      │
│ Assign Role          │  ✓   │     ✗     │      ✗      │
│ Remove Participant   │  ✓   │     ✗     │      ✗      │
│ Transfer Host        │  ✓   │     ✗     │      ✗      │
└──────────────────────┴──────┴───────────┴─────────────┘
```

### Why Backend Validation is Critical

1. **Frontend can be modified** — DevTools can bypass any client-side check
2. **Race conditions** — Two users promoting simultaneously without server validation
3. **State corruption** — Unvalidated seeks can desync all participants
4. **Privilege escalation** — Without server checks, any user could emit `assign_role`

### Server-Side Validation Pattern

```typescript
socket.on("play", ({ roomId, currentTime }) => {
  const room = roomManager.getRoom(roomId);
  if (!room) return socket.emit("error", { code: "ROOM_NOT_FOUND" });

  if (!room.validatePermission(userId, "play")) {
    return socket.emit("error", {
      code: "UNAUTHORIZED",
      message: "No permission to control playback",
    });
  }

  room.updateVideoState({ state: "playing", currentTime });
  room.broadcast("video_action", room.videoState);
});
```

---

## 5. YouTube IFrame Integration

### How It Works

1. Load `https://www.youtube.com/iframe_api` dynamically
2. Create `YT.Player` instance targeting a DOM element
3. Listen to `onStateChange` for play/pause/buffer events
4. Use `isSyncing` flag to prevent feedback loops

### Sync Consistency Pattern

```
User clicks Play → YouTube fires onStateChange(PLAYING) →
  Check isSyncing flag:
    If true → ignore (this was triggered by remote sync)
    If false → emit 'play' to server → server broadcasts →
      All clients receive → set isSyncing=true → player.playVideo() →
        YouTube fires onStateChange(PLAYING) → isSyncing=true → ignored
        After 500ms → isSyncing=false
```

### Video ID Extraction

Supports: `youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, bare 11-char IDs.

---

## 6. Scalability Design

### Target: 1000+ concurrent users, 100+ rooms, 50+ users per room

### Redis Pub/Sub Architecture

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Server 1 │◄──►│  Redis   │◄──►│ Server 2 │
│ 500 users│    │ Pub/Sub  │    │ 500 users│
└──────────┘    │ Adapter  │    └──────────┘
                └──────────┘
```

**Socket.IO Redis Adapter** automatically:

- Publishes events to Redis when broadcasting
- Subscribes to Redis channels to receive events from other instances
- Routes events to the correct local sockets

### Setup

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### Sticky Sessions (Required)

Socket.IO uses HTTP long-polling as fallback before upgrading to WebSocket. The polling requests must hit the same server instance.

**Nginx config:**

```nginx
upstream socket_servers {
  ip_hash;  # or use cookie-based
  server backend1:3000;
  server backend2:3000;
}
```

### Memory Management

- Room cleanup on empty (5-minute sweep)
- Participant cleanup on disconnect
- Redis TTL on session keys
- Max participants per room (configurable, default 50)
- Max rooms per server (configurable, default 200)

---

## 7. Deployment Guide (Render/Railway)

### Environment Variables

```env
# .env
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Redis (for scaling)
REDIS_URL=redis://default:pass@host:6379

# Auth
JWT_SECRET=your-jwt-secret

# CORS
ALLOWED_ORIGINS=https://yourdomain.com

# WebSocket
WS_PATH=/socket.io
```

### CORS Configuration

```typescript
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: process.env.WS_PATH || "/socket.io",
  transports: ["websocket", "polling"],
});
```

### SSL/WSS

- Render/Railway handle SSL termination automatically
- Client connects to `wss://your-backend.onrender.com`
- No SSL cert configuration needed in Node.js

### Build Commands (Render)

```
Build: npm install && npm run build
Start: npm start
```

### Common WebSocket Deployment Issues

1. **Connection timeout**: Increase Render's health check timeout
2. **CORS errors**: Ensure `ALLOWED_ORIGINS` includes your frontend URL
3. **Polling fallback fails**: Enable sticky sessions
4. **Memory leaks**: Implement room cleanup, monitor with `process.memoryUsage()`

---

## 8. Security Considerations

1. **JWT Validation**: Verify token on every WebSocket connection and event
2. **Rate Limiting**: Max 10 events/second per socket, disconnect on abuse
3. **Input Validation**: Sanitize all payloads (room names, video URLs)
4. **Role Escalation Prevention**: Server-side role checks on every action
5. **Flood Protection**: Debounce seek events, ignore duplicate state changes
6. **CORS**: Strict origin allowlist in production
7. **Memory Abuse**: Max room/participant limits, auto-cleanup timers
8. **Video URL Validation**: Only allow youtube.com domains

### Rate Limiter Example

```typescript
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(socketId: string, limit = 10, window = 1000): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(socketId) || [];
  const recent = timestamps.filter((t) => now - t < window);

  if (recent.length >= limit) return false;

  recent.push(now);
  rateLimiter.set(socketId, recent);
  return true;
}
```

---

## 9. Bonus Architecture (Design Only)

### Text Chat

```typescript
// New events: chat_message, chat_history
socket.on("chat_message", ({ roomId, text }) => {
  // Validate, sanitize, rate-limit
  room.broadcast("chat_message", {
    userId,
    username,
    text: sanitize(text),
    timestamp: Date.now(),
  });
});
```

### Emoji Reactions

```typescript
// Ephemeral — no persistence needed
socket.on("reaction", ({ roomId, emoji }) => {
  room.broadcast("reaction", { userId, emoji, timestamp: Date.now() });
});
```

### JWT Authentication Flow

```
Client connects → sends JWT in auth handshake →
  Server validates with Supabase/custom secret →
    Extracts userId → Associates with socket →
      Allows room operations
```

### Room Expiration

```typescript
// In Room constructor
this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// In RoomManager cleanup
if (room.expiresAt < new Date()) {
  room.broadcast("room_expired", {});
  this.deleteRoom(id);
}
```

### Analytics Logging

```typescript
// Log events to database asynchronously
async function logEvent(
  event: string,
  roomId: string,
  userId: string,
  data: any,
) {
  await db.insert("analytics_events", {
    event,
    room_id: roomId,
    user_id: userId,
    data: JSON.stringify(data),
    timestamp: new Date(),
  });
}
```

---

## 10. Event Flow Walkthrough

### Host Creates Room & Plays Video

```
1. Host → POST /rooms { name, videoUrl }
2. Server → creates room in DB, returns room ID
3. Host → WebSocket: join_room { roomId, token }
4. Server → validates JWT, creates Room object, adds Participant(role=host)
5. Server → sync_state { videoState, participants: [host] }
6. Host → loads YouTube player with videoId
7. Host clicks play → YouTube onStateChange(PLAYING)
8. Host → WebSocket: play { roomId, currentTime: 5.2 }
9. Server → validatePermission(hostId, 'play') → ✓
10. Server → room.updateVideoState({ state: 'playing', currentTime: 5.2 })
11. Server → broadcast video_action to room
12. (No other participants yet — event sent to empty room)
```

### Participant Joins Mid-Video

```
1. Participant → WebSocket: join_room { roomId, token }
2. Server → validates JWT, adds Participant(role=participant)
3. Server → sync_state { videoState: { state: 'playing', currentTime: 42.7 }, participants }
4. Participant → sets isSyncing=true
5. Participant → player.seekTo(42.7) → player.playVideo()
6. YouTube fires onStateChange → isSyncing=true → ignored
7. After 500ms → isSyncing=false → ready for local events
```

### Race Condition Prevention

```
Two moderators seek simultaneously:
  Mod A → seek(10.0) at T=0ms
  Mod B → seek(20.0) at T=5ms

Server processes sequentially (single-threaded Node.js):
  1. Process Mod A's seek → state.currentTime = 10.0 → broadcast
  2. Process Mod B's seek → state.currentTime = 20.0 → broadcast

All clients end at 20.0 (last write wins, server is authoritative)
```

---

## 11. Trade-offs & Decisions

| Decision                  | Trade-off                                                      |
| ------------------------- | -------------------------------------------------------------- |
| Socket.IO over raw `ws`   | Larger bundle, but auto-reconnect, rooms, fallback transport   |
| In-memory rooms over DB   | Faster, but lost on restart. Persist periodically for recovery |
| Redis Pub/Sub             | Added infrastructure, but enables horizontal scaling           |
| JWT over session cookies  | Stateless, but need refresh logic                              |
| Supabase Realtime (MVP)   | No custom server needed, but less control over validation      |
| Last-write-wins for seeks | Simple, but brief desync possible with concurrent seeks        |
| 300ms seek debounce       | Prevents spam, but adds slight delay to seek sync              |

---

## Folder Structure (Full Backend)

```
server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Express + Socket.IO setup
│   ├── config/
│   │   └── env.ts            # Environment validation
│   ├── models/
│   │   ├── Participant.ts    # Participant class
│   │   ├── Room.ts           # Room class
│   │   └── RoomManager.ts    # Room manager
│   ├── handlers/
│   │   ├── connection.ts     # Socket connect/disconnect
│   │   ├── room.ts           # join/leave room
│   │   ├── playback.ts       # play/pause/seek/change
│   │   └── roles.ts          # assign/remove/transfer
│   ├── middleware/
│   │   ├── auth.ts           # JWT validation
│   │   └── rateLimit.ts      # Per-socket rate limiting
│   └── utils/
│       ├── logger.ts         # Structured logging
│       └── validation.ts     # Input sanitization
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── README.md
```
