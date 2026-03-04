import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useMyRooms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-rooms', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get rooms where user is host
      const { data: hostedRooms, error: e1 } = await supabase
        .from('rooms')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });
      if (e1) throw e1;

      // Get rooms where user is participant
      const { data: participantEntries, error: e2 } = await supabase
        .from('room_participants')
        .select('room_id, role, rooms(*)')
        .eq('user_id', user.id);
      if (e2) throw e2;

      const participantRooms = (participantEntries || [])
        .filter((e) => e.rooms && !(hostedRooms || []).find((r) => r.id === e.room_id))
        .map((e) => ({ ...e.rooms!, _role: e.role }));

      return [
        ...(hostedRooms || []).map((r) => ({ ...r, _role: 'host' as const })),
        ...participantRooms,
      ];
    },
    enabled: !!user,
  });
}

export function useCreateRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, videoUrl }: { name: string; videoUrl?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ host_id: user.id, name, video_url: videoUrl || null })
        .select()
        .single();
      if (roomError) throw roomError;

      // Add host as participant
      const { error: partError } = await supabase
        .from('room_participants')
        .insert({ room_id: room.id, user_id: user.id, role: 'host' });
      if (partError) throw partError;

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
    },
  });
}

export function useJoinRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already a participant
      const { data: existing } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from('room_participants')
        .insert({ room_id: roomId, user_id: user.id, role: 'participant' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
    },
  });
}
