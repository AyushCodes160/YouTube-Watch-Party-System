import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './models/RoomManager';
import { Role } from './models/Participant';

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:8080',
  methods: ['GET', 'POST']
}));
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:8080',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

// --- REST ENDPOINTS ---

app.post('/api/rooms', (req, res) => {
  const { hostId, hostUsername } = req.body;
  
  if (!hostId || !hostUsername) {
    return res.status(400).json({ error: 'hostId and hostUsername are required' });
  }

  const room = roomManager.createRoom(hostId, hostUsername);
  res.json({ roomId: room.id, room: room });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    id: room.id,
    participants: room.getParticipantList(),
    videoState: room.videoState,
    createdAt: room.createdAt
  });
});

// --- SOCKET.IO HANDLING ---

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join Room
  socket.on('join_room', (data: { roomId: string, userId: string, username: string, isHost?: boolean }) => {
    const { roomId, userId, username, isHost } = data;
    const room = roomManager.getRoom(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Determine default role (if not already in room, and if not the creator host)
    let role: Role = 'participant';
    if (room.hostId === userId || isHost) {
      role = 'host';
    }

    // Add to room internal state
    const existingParticipant = room.participants.get(userId);
    if (!existingParticipant) {
        room.addParticipant(userId, username, role);
    } else {
        // Just Update socket session mappings if needed, username might have changed
        existingParticipant.username = username;
    }

    // Join Socket.io room channel
    socket.join(roomId);

    // Save user/room data on the socket object for disconnect handling
    socket.data = { userId, roomId };

    // Broadcast updated participant list
    io.to(roomId).emit('participants_updated', room.getParticipantList());
    
    // Sync new user with current video state
    socket.emit('sync_state', room.videoState);
    
    console.log(`User ${username} (${userId}) joined room ${roomId}`);
  });

  // Handle Play
  socket.on('play', (data: { roomId: string, currentTime: number, videoId?: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'play')) {
      room.updateVideoState({ state: 'playing', currentTime: data.currentTime, videoId: data.videoId });
      socket.to(roomId).emit('sync_state', room.videoState);
      console.log(`[Room ${roomId}] Play allowed by ${userId}`);
    } else {
      console.warn(`[Room ${roomId}] Play DENIED for ${userId}`);
    }
  });

  // Handle Pause
  socket.on('pause', (data: { roomId: string, currentTime: number, videoId?: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'pause')) {
      room.updateVideoState({ state: 'paused', currentTime: data.currentTime, videoId: data.videoId });
      socket.to(roomId).emit('sync_state', room.videoState);
      console.log(`[Room ${roomId}] Pause allowed by ${userId}`);
    } else {
      console.warn(`[Room ${roomId}] Pause DENIED for ${userId}`);
    }
  });

  // Handle Seek
  socket.on('seek', (data: { roomId: string, currentTime: number, videoId?: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'seek')) {
      room.updateVideoState({ currentTime: data.currentTime, videoId: data.videoId });
      socket.to(roomId).emit('sync_state', room.videoState);
    }
  });

  // Handle Change Video
  socket.on('change_video', (data: { roomId: string, videoId: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'change_video')) {
      room.updateVideoState({ state: 'paused', currentTime: 0, videoId: data.videoId });
      // Here we broadcast to ALL including the sender because the sender's player needs to load the new ID
      io.to(roomId).emit('sync_state', room.videoState);
    }
  });

  // Handle Role Assignment
  socket.on('assign_role', (data: { roomId: string, targetId: string, role: Role }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.assignRole(data.targetId, data.role, userId)) {
      io.to(roomId).emit('participants_updated', room.getParticipantList());
    }
  });

  // Handle Participant Removal
  socket.on('remove_participant', (data: { roomId: string, targetId: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'remove_participant')) {
      room.removeParticipant(data.targetId);
      io.to(roomId).emit('participants_updated', room.getParticipantList());
      
      // We emit a specific event indicating removal so the client can navigate away
      io.to(roomId).emit('participant_removed', { targetId: data.targetId });
    }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.data && socket.data.roomId && socket.data.userId) {
      const { roomId, userId } = socket.data;
      const room = roomManager.getRoom(roomId);
      
      if (room) {
        room.removeParticipant(userId);
        io.to(roomId).emit('participants_updated', room.getParticipantList());
        
        // Let RoomManager cleanup empty rooms on its interval
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend Watch Party Server listening on port ${PORT}`);
});
