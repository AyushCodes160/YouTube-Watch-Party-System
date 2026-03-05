import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import connectDB from './config/db';
import User from './models/User';
import RoomMongo from './models/RoomMongo';
import { RoomManager } from './models/RoomManager';
import { Role } from './models/Participant';

connectDB();

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:8080';

const app = express();
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const roomManager = new RoomManager();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_watchparty_key_change_me';

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0].value;
      if (!email) return done(new Error('No email found in Google profile'));

      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: email }
        ]
      });

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: email,
          username: profile.displayName || email.split('@')[0],
        });
      } else if (!user.googleId) {
        // Link existing email account to Google
        user.googleId = profile.id;
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

app.use(passport.initialize());


const protect = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      (req as any).user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};


app.post('/api/auth/signup', async (req, res) => {
  const { email, password, username } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const user = await User.create({ email, password, username });
  if (user) {
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ _id: user._id, email: user.email, username: user.username, token });
  } else {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user: any = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ _id: user._id, email: user.email, username: user.username, token });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// OAuth Routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: `${allowedOrigin}/login?error=oauth_failed`, session: false }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    
    // Redirect to frontend with token and user data in query params
    const userData = encodeURIComponent(JSON.stringify({
      _id: user._id,
      email: user.email,
      username: user.username,
      token
    }));
    
    res.redirect(`${allowedOrigin}/oauth-success?data=${userData}`);
  }
);


app.post('/api/rooms', protect, async (req, res) => {
  const { name, videoUrl } = req.body;
  const user = (req as any).user;
  
  try {
    const room = await roomManager.createRoom(user._id.toString(), user.username, name, videoUrl);
    res.json({ roomId: room.id, room: room });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/my-rooms', protect, async (req, res) => {
  const user = (req as any).user;
  try {
    const hostedRooms = await RoomMongo.find({ hostId: user._id }).sort({ createdAt: -1 });
    
    const participatingRooms = await RoomMongo.find({
      'participants.user': user._id,
      hostId: { $ne: user._id }
    }).sort({ createdAt: -1 });

    const mapRoles = (rooms: any[], role: string) => {
      return rooms.map(r => {
        let actualRole = role;
        if (role !== 'host') {
          const part = r.participants.find((p: any) => p.user.toString() === user._id.toString());
          if (part) actualRole = part.role;
        }
        return {
           id: r.roomId,
           name: r.name,
           created_at: r.createdAt,
           _role: actualRole
        };
      });
    };

    res.json([
       ...mapRoles(hostedRooms, 'host'),
       ...mapRoles(participatingRooms, 'participant')
    ]);
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId', protect, async (req, res) => {
  const roomId = req.params.roomId as string;
  const room = await roomManager.loadRoom(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const dbRoom = await RoomMongo.findOne({ roomId });
  
  res.json({
    id: room.id,
    name: dbRoom?.name,
    video_url: dbRoom?.videoUrl,
    participants: room.getParticipantList(),
    videoState: room.videoState,
    createdAt: room.createdAt
  });
});

app.delete('/api/rooms/:roomId', protect, async (req, res) => {
  const roomId = req.params.roomId as string;
  const user = (req as any).user;
  const userId = user._id.toString();
  
  try {
    const roomRecord = await RoomMongo.findOne({ roomId });
    if (!roomRecord) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomRecord.hostId.toString() === userId) {
      // Host: Perform full deletion
      io.to(roomId).emit('room_deleted', { roomId });
      await roomManager.deleteRoom(roomId);
      return res.json({ success: true, message: 'Room deleted successfully' });
    } else {
      // Participant: Just leave/remove from history
      await RoomMongo.updateOne(
        { roomId },
        { $pull: { participants: { user: userId } } }
      );

      // If room is in memory, remove from there too
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.removeParticipant(userId);
        io.to(roomId).emit('participants_updated', room.getParticipantList());
      }

      return res.json({ success: true, message: 'Room removed from history' });
    }
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});


io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: No token'));
  
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('Authentication error: User missing'));
    
    (socket as any).user = user;
    next();
  } catch(err) {
    next(new Error('Authentication error: Invalid structure'));
  }
});

io.on('connection', (socket: Socket) => {
  const user = (socket as any).user;
  const userId = user._id.toString();
  const username = user.username;
  console.log(`User connected: ${username} (${socket.id})`);


  socket.on('join_room', async (data: { roomId: string }) => {
    const { roomId } = data;

    const room = await roomManager.loadRoom(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    let role: Role = 'participant';
    if (room.hostId === userId) {
      role = 'host';
    }

    const existingParticipant = room.participants.get(userId);
    if (!existingParticipant) {
        room.addParticipant(userId, username, role);
        try {
          await RoomMongo.updateOne(
            { roomId },
            { $push: { participants: { user: userId, role } } }
          );
        } catch(e) {}
    } else {
        existingParticipant.username = username;
    }

    socket.join(roomId);
    socket.data = { userId, roomId };

    io.to(roomId).emit('participants_updated', room.getParticipantList());
    let stateToSend = { ...room.videoState };
    if (stateToSend.state === 'playing' && stateToSend.updatedAt) {
      const elapsed = (Date.now() - stateToSend.updatedAt) / 1000;
      stateToSend.currentTime += elapsed;
      stateToSend.updatedAt = Date.now();
    }
    socket.emit('sync_state', stateToSend);
    socket.emit('chat_history', room.messages);
    
    console.log(`User ${username} joined room ${roomId}`);
  });

  socket.on('send_message', (data: { roomId: string, text: string }) => {
    if (!socket.data) {
      console.log('send_message failed: No socket.data');
      return;
    }
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && data.text.trim()) {
      const msg = room.addMessage(userId, username, data.text.trim());
      io.to(roomId).emit('receive_message', msg);
    } else {
      console.log(`send_message failed for room ${roomId}. Room exists: ${!!room}, has text: ${!!data.text}`);
    }
  });

  const syncStateToDb = (roomId: string, state: any) => {
     RoomMongo.updateOne({ roomId }, { $set: { videoState: state }}).catch(e => console.error(e));
  }


  socket.on('play', (data: { roomId: string, currentTime: number, videoId?: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'play')) {
      room.updateVideoState({ state: 'playing', currentTime: data.currentTime, videoId: data.videoId });
      socket.to(roomId).emit('sync_state', room.videoState);
      syncStateToDb(roomId, room.videoState);
    }
  });


  socket.on('pause', (data: { roomId: string, currentTime: number, videoId?: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'pause')) {
      room.updateVideoState({ state: 'paused', currentTime: data.currentTime, videoId: data.videoId });
      socket.to(roomId).emit('sync_state', room.videoState);
      syncStateToDb(roomId, room.videoState);
    }
  });


  socket.on('seek', (data: { roomId: string, currentTime: number, videoId?: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'seek')) {
      room.updateVideoState({ currentTime: data.currentTime, videoId: data.videoId });
      socket.to(roomId).emit('sync_state', room.videoState);
      syncStateToDb(roomId, room.videoState);
    }
  });


  socket.on('change_video', async (data: { roomId: string, videoId: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'change_video')) {
      room.updateVideoState({ state: 'paused', currentTime: 0, videoId: data.videoId });
      io.to(roomId).emit('sync_state', room.videoState);
      
      await RoomMongo.updateOne(
        { roomId }, 
        { $set: { videoUrl: `https://youtube.com/watch?v=${data.videoId}`, videoState: room.videoState } }
      );
    }
  });


  socket.on('assign_role', async (data: { roomId: string, targetId: string, role: Role }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.assignRole(data.targetId, data.role, userId)) {
      io.to(roomId).emit('participants_updated', room.getParticipantList());
      io.to(roomId).emit('room_updated', { id: roomId }); // Notify all to refetch if needed
      
      try {
         await RoomMongo.updateOne(
           { roomId, 'participants.user': data.targetId },
           { $set: { 'participants.$.role': data.role } }
         );
      } catch(e) {}
    }
  });


  socket.on('remove_participant', async (data: { roomId: string, targetId: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);
    
    if (room && room.validatePermission(userId, 'remove_participant')) {
      room.removeParticipant(data.targetId);
      io.to(roomId).emit('participants_updated', room.getParticipantList());
      io.to(roomId).emit('participant_removed', { targetId: data.targetId });
      
      try {
        await RoomMongo.updateOne(
           { roomId },
           { $pull: { participants: { user: data.targetId } } }
        );
      } catch(e) {}
    }
  });


  socket.on('transfer_host', async (data: { roomId: string, targetId: string }) => {
    if (!socket.data) return;
    const { userId, roomId } = socket.data;
    const room = roomManager.getRoom(roomId);

    if (room && room.transferHost(data.targetId, userId)) {
      io.to(roomId).emit('participants_updated', room.getParticipantList());
      io.to(roomId).emit('room_updated', { id: roomId }); // Notify all to refetch room details
      
      try {
        await RoomMongo.updateOne({ roomId }, {
          $set: { hostId: data.targetId }
        });
        await RoomMongo.updateOne(
          { roomId, 'participants.user': data.targetId },
          { $set: { 'participants.$.role': 'host' } }
        );
        await RoomMongo.updateOne(
          { roomId, 'participants.user': userId },
          { $set: { 'participants.$.role': 'participant' } }
        );
      } catch(e) {}
    }
  });


  socket.on('disconnect', () => {
    if (socket.data && socket.data.roomId && socket.data.userId) {
      const { roomId, userId } = socket.data;
      const room = roomManager.getRoom(roomId);
      
      if (room) {
        const remainingSockets = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
        io.to(roomId).emit('participants_updated', room.getParticipantList());
      }
    }
  });
});

import path from 'path';

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));

  app.get('{*path}', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend Server listening on port ${PORT}`);

  if (process.env.RENDER_EXTERNAL_URL) {
    const url = process.env.RENDER_EXTERNAL_URL;
    setInterval(() => {
      fetch(url)
        .then(() => console.log(`[keep-alive] Pinged ${url}`))
        .catch((err) => console.error('[keep-alive] Ping failed:', err.message));
    }, 14 * 60 * 1000);
  }
});
