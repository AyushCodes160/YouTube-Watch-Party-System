import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';
import { RealtimeChannel } from '@supabase/supabase-js';

type Room = Tables<'rooms'>;
type Participant = Tables<'room_participants'>;
type Message = Tables<'room_messages'>;

export function useRoom(roomId: string | undefined) {
  const { user, username } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myRole, setMyRole] = useState<string>('participant');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const canControl = myRole === 'host' || myRole === 'moderator';

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomId || !user) return;
    
    const { data, error: err } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (err) { setError('Room not found'); setLoading(false); return; }
    setRoom(data);
    setLoading(false);
  }, [roomId, user]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId);
    if (data) {
      setParticipants(data);
      const me = data.find(p => p.user_id === user?.id);
      if (me) setMyRole(me.role);
    }
  }, [roomId, user?.id]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data);
  }, [roomId]);

  // Join room
  const joinRoom = useCallback(async () => {
    if (!roomId || !user) return;

    const { error: joinErr } = await supabase
      .from('room_participants')
      .upsert({
        room_id: roomId,
        user_id: user.id,
        username,
        role: room?.host_id === user.id ? 'host' : 'participant',
      }, { onConflict: 'room_id,user_id' });

    if (joinErr) console.error('Join error:', joinErr);
    await fetchParticipants();
  }, [roomId, user, username, room?.host_id, fetchParticipants]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!roomId || !user) return;
    await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);
  }, [roomId, user]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!roomId || !user || !content.trim()) return;
    await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: user.id,
      username,
      content: content.trim().slice(0, 500),
    });
  }, [roomId, user, username]);

  // Update video state
  const updateVideoState = useCallback(async (update: Partial<Room>) => {
    if (!roomId || !canControl) return;
    await supabase
      .from('rooms')
      .update({ ...update, last_synced_at: new Date().toISOString() })
      .eq('id', roomId);
  }, [roomId, canControl]);

  // Assign role
  const assignRole = useCallback(async (participantUserId: string, role: 'moderator' | 'participant') => {
    if (!roomId || !canControl) return;
    await supabase
      .from('room_participants')
      .update({ role })
      .eq('room_id', roomId)
      .eq('user_id', participantUserId);
  }, [roomId, canControl]);

  // Remove participant
  const removeParticipant = useCallback(async (participantUserId: string) => {
    if (!roomId || myRole !== 'host') return;
    await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', participantUserId);
  }, [roomId, myRole]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roomId || !user) return;

    fetchRoom();
    fetchMessages();

    // Subscribe to room changes (video state)
    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        setRoom(payload.new as Room);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchParticipants();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => [...prev.slice(-99), payload.new as Message]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, user, fetchRoom, fetchMessages, fetchParticipants]);

  return {
    room,
    participants,
    messages,
    myRole,
    canControl,
    loading,
    error,
    joinRoom,
    leaveRoom,
    sendMessage,
    updateVideoState,
    assignRole,
    removeParticipant,
    fetchParticipants,
  };
}
