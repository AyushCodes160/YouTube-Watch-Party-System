import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { VideoState } from '@/lib/youtube';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Participant {
  user_id: string;
  username: string;
  role: 'host' | 'moderator' | 'participant';
  online: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export function useWatchParty(roomId: string, { onReaction }: { onReaction?: (emoji: string) => void } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const isSyncingRef = useRef(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({ state: 'paused', currentTime: 0, updatedAt: Date.now() });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

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
      socket.emit('join_room', { roomId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('participants_updated', (updatedList: Participant[]) => {
      setParticipants(updatedList);
    });

    socket.on('participant_joined', ({ username }) => {
      toast.info(`${username} joined the room`, {
        position: 'bottom-right',
      });
    });

    socket.on('sync_state', (newState: VideoState) => {
      setVideoState(newState);
    });

    socket.on('participant_removed', ({ targetId }) => {
      if (targetId === user?._id) {
        toast.info('You have been removed from the room');
        navigate('/dashboard');
      }
    });

    socket.on('room_deleted', () => {
      toast.info('The host has deleted this room');
      navigate('/dashboard');
    });

    socket.on('room_updated', () => {
      refetchRoom();
    });

    socket.on('chat_history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on('receive_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.userId !== user?._id) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    socket.on('receive_reaction', ({ emoji }) => {
      onReaction?.(emoji);
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


  const broadcastAction = useCallback(
    async (newState: VideoState) => {
      if (!socketRef.current) return;
      
      setVideoState(newState);

      if (newState.state === 'playing') {
        socketRef.current.emit('play', { roomId, currentTime: newState.currentTime, videoId: newState.videoId });
      } else if (newState.state === 'paused') {
        socketRef.current.emit('pause', { roomId, currentTime: newState.currentTime, videoId: newState.videoId });
      }
      
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

  const sendMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        socketRef.current?.emit('send_message', { roomId, text });
      }
    },
    [roomId]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      socketRef.current?.emit('send_reaction', { roomId, emoji });
    },
    [roomId]
  );

  const leaveRoom = useCallback(async () => {
    socketRef.current?.disconnect();
  }, []);

  return {
    room,
    participants,
    messages,
    myRole,
    videoState,
    isConnected,
    isSyncingRef,
    broadcastAction,
    updateRole,
    removeParticipant,
    transferHost,
    sendMessage,
    sendReaction,
    leaveRoom,
    refetchRoom,
    unreadCount,
    setUnreadCount,
  };
}
