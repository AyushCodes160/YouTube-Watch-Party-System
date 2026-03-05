import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import type { VideoState } from '@/lib/youtube';

// In production (same origin on Render), VITE_BACKEND_URL should be empty or unset.
// In development, set VITE_BACKEND_URL=http://localhost:3001
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Participant {
  user_id: string;
  username: string;
  role: 'host' | 'moderator' | 'participant';
  online: boolean;
}

export function useWatchParty(roomId: string) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const isSyncingRef = useRef(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({ state: 'paused', currentTime: 0, updatedAt: Date.now() });
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<any>(null); // For UI compatibility

  // Compute my role from participants list
  const myParticipant = participants.find(p => p.user_id === user?._id);
  const myRole = myParticipant?.role ?? null;

  useEffect(() => {
    if (!roomId) return;
    
    if (!user?.token) return;

    const socket = io(SERVER_URL, {
      auth: { token: user.token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join room via socket. We pass isHost=false since backend manages auth via creator logic over REST,
      // but for simplicity we rely on backend's state for everything. 
      // It assigns first user or creator as host.
      socket.emit('join_room', { roomId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('participants_updated', (updatedList: Participant[]) => {
      setParticipants(updatedList);
    });

    socket.on('sync_state', (newState: VideoState) => {
      setVideoState(newState);
    });

    socket.on('participant_removed', ({ targetId }) => {
      if (targetId === user?._id) {
        window.location.href = '/dashboard';
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, user]);

  // Initial Rest Fetch to get Room details (like Name)
  const refetchRoom = useCallback(async () => {
    if (!user?.token) return;
    
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRoom({ id: data.id, name: `Room ${data.id}`, video_url: data.videoState?.videoId ? `https://youtube.com/watch?v=${data.videoState.videoId}` : undefined });
      } else {
        console.error('Failed to fetch room:', await res.text());
      }
    } catch (e) {
      console.error(e);
    }
  }, [roomId, user?.token]);

  useEffect(() => {
    refetchRoom();
  }, [refetchRoom]);

  // --- ACTIONS TO SERVER ---

  const broadcastAction = useCallback(
    async (newState: VideoState) => {
      if (!socketRef.current) return;
      
      setVideoState(newState);

      if (newState.state === 'playing') {
        socketRef.current.emit('play', { roomId, currentTime: newState.currentTime, videoId: newState.videoId });
      } else if (newState.state === 'paused') {
        socketRef.current.emit('pause', { roomId, currentTime: newState.currentTime, videoId: newState.videoId });
      }
      
      // If the Video ID changed specifically
      if (newState.videoId && newState.videoId !== videoState.videoId) {
         socketRef.current.emit('change_video', { roomId, videoId: newState.videoId });
      }
    },
    [roomId, videoState.videoId]
  );

  const updateRole = useCallback(
    async (targetUserId: string, newRole: 'moderator' | 'participant') => {
      socketRef.current?.emit('assign_role', { roomId, targetId: targetUserId, role: newRole });
    },
    [roomId]
  );

  const removeParticipant = useCallback(
    async (targetUserId: string) => {
      socketRef.current?.emit('remove_participant', { roomId, targetId: targetUserId });
    },
    [roomId]
  );

  const transferHost = useCallback(
    async (targetUserId: string) => {
      socketRef.current?.emit('transfer_host', { roomId, targetId: targetUserId });
    },
    [roomId]
  );

  const leaveRoom = useCallback(async () => {
    socketRef.current?.disconnect();
  }, []);

  return {
    room,
    participants,
    myRole,
    videoState,
    isConnected,
    isSyncingRef,
    broadcastAction,
    updateRole,
    removeParticipant,
    transferHost,
    leaveRoom,
    refetchRoom,
  };
}
