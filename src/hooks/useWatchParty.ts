import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { VideoState } from '@/lib/youtube';

interface Participant {
  user_id: string;
  username: string;
  role: 'host' | 'moderator' | 'participant';
  online: boolean;
}

interface WatchPartyState {
  room: any;
  participants: Participant[];
  myRole: 'host' | 'moderator' | 'participant' | null;
  videoState: VideoState;
  isConnected: boolean;
}

export function useWatchParty(roomId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSyncingRef = useRef(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({ state: 'paused', currentTime: 0 });
  const [isConnected, setIsConnected] = useState(false);

  // Fetch room data
  const { data: room, refetch: refetchRoom } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  // Fetch my role
  const { data: myParticipant } = useQuery({
    queryKey: ['my-role', roomId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('room_participants')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!roomId && !!user,
  });

  const myRole = myParticipant?.role ?? null;

  // Fetch participants from DB
  const fetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('room_participants')
      .select('user_id, role, profiles(username)')
      .eq('room_id', roomId);
    if (data) {
      setParticipants(
        data.map((p: any) => ({
          user_id: p.user_id,
          username: p.profiles?.username || 'Anonymous',
          role: p.role,
          online: false, // Will be updated by presence
        }))
      );
    }
  }, [roomId]);

  // Set up Realtime channel
  useEffect(() => {
    if (!roomId || !user) return;

    fetchParticipants();

    // Initialize video state from room
    if (room?.video_state) {
      const vs = room.video_state as any;
      setVideoState({
        state: vs.state || 'paused',
        currentTime: vs.currentTime || 0,
        videoId: vs.videoId,
        updatedAt: vs.updatedAt,
      });
    }

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: user.id } },
    });

    // Presence
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const onlineIds = Object.keys(presenceState);
      setParticipants((prev) =>
        prev.map((p) => ({ ...p, online: onlineIds.includes(p.user_id) }))
      );
    });

    channel.on('presence', { event: 'join' }, () => {
      fetchParticipants();
    });

    channel.on('presence', { event: 'leave' }, () => {
      fetchParticipants();
    });

    // Broadcast events
    channel.on('broadcast', { event: 'video_action' }, ({ payload }) => {
      if (payload.sender_id === user.id) return;
      isSyncingRef.current = true;
      setVideoState(payload.videoState);
      // Reset syncing flag after a short delay
      setTimeout(() => { isSyncingRef.current = false; }, 500);
    });

    channel.on('broadcast', { event: 'role_update' }, () => {
      queryClient.invalidateQueries({ queryKey: ['my-role', roomId] });
      fetchParticipants();
    });

    channel.on('broadcast', { event: 'participant_removed' }, ({ payload }) => {
      if (payload.user_id === user.id) {
        // I was removed
        window.location.href = '/dashboard';
        return;
      }
      fetchParticipants();
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        await channel.track({
          user_id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0],
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, user, room?.video_state, fetchParticipants, queryClient]);

  // Broadcast a video action (only host/moderator should call this)
  const broadcastAction = useCallback(
    async (newState: VideoState) => {
      if (!channelRef.current || !user) return;
      if (myRole !== 'host' && myRole !== 'moderator') return;

      setVideoState(newState);

      // Broadcast to all participants
      channelRef.current.send({
        type: 'broadcast',
        event: 'video_action',
        payload: { sender_id: user.id, videoState: newState },
      });

      // Persist to DB
      await supabase
        .from('rooms')
        .update({
          video_state: newState as any,
          video_url: newState.videoId
            ? `https://youtube.com/watch?v=${newState.videoId}`
            : room?.video_url,
        })
        .eq('id', roomId);
    },
    [user, myRole, roomId, room?.video_url]
  );

  // Update participant role
  const updateRole = useCallback(
    async (targetUserId: string, newRole: 'moderator' | 'participant') => {
      if (myRole !== 'host') return;

      await supabase
        .from('room_participants')
        .update({ role: newRole })
        .eq('room_id', roomId)
        .eq('user_id', targetUserId);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'role_update',
        payload: { user_id: targetUserId, role: newRole },
      });

      fetchParticipants();
    },
    [myRole, roomId, fetchParticipants]
  );

  // Remove participant
  const removeParticipant = useCallback(
    async (targetUserId: string) => {
      if (myRole !== 'host') return;

      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', targetUserId);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'participant_removed',
        payload: { user_id: targetUserId },
      });

      fetchParticipants();
    },
    [myRole, roomId, fetchParticipants]
  );

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);
  }, [user, roomId]);

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
    leaveRoom,
    refetchRoom,
  };
}
