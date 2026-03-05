# YouTube Watch Party System

A clean, production-ready Watch Party system featuring real-time synchronization, authoritative Role-Based Access Control (RBAC), and premium animations.

## Live Deployment

- **Full Application (Render)**: [https://youtube-watch-party-system-1e2z.onrender.com](https://youtube-watch-party-system-1e2z.onrender.com)

## Key Features

- **Real-time Sync**: Video playback (play/pause/seek) is synced across all participants with millisecond precision.
- **Role-Based Access**: Specialized controls for Hosts and Moderators.
- **Interactive Hero**: Dynamic, YouTube-themed revolving animations on the home screen.
- **Presence Tracking**: Real-time "online" status and participant counting.
- **Smart Notifications**: Join alerts and unread chat indicators.
- **Google OAuth**: One-click secure login.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express, Socket.IO, Mongoose, Passport (OAuth)
- **Database**: MongoDB (Production) / In-memory (Dev)

## Setup & Local Development

### Prerequisites

- Node.js (v18+)
- npm or yarn

### 1. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=3001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
ALLOWED_ORIGIN=http://localhost:5173
```

Run the backend:

```bash
npm run dev
```

### 2. Frontend Setup

```bash
# In the root directory
npm install
```

Create a `.env` file in the root directory:

```env
VITE_BACKEND_URL=http://localhost:3001
```

Run the frontend:

```bash
npm run dev
```

## Deployment

The application is optimized for **Render**. Use the provided `render-build.sh` for a unified deployment if deploying as a single service, or deploy the `server` and root directories independently.

## Architecture & Trade-offs

- **Memory vs DB**: Real-time room states (Participant lists, Video Seek positions) are kept in memory for ultra-low latency, while users and permanent room metadata are persisted in MongoDB.
- **Stateless Socket Loop**: Each state change is validated against the server-side Participant model before broadcasting, ensuring security even if the client is compromised.
