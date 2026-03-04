import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function useMyRooms() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-rooms', user?._id],
    queryFn: async () => {
      if (!user?.token) return [];
      
      const res = await fetch(`${SERVER_URL}/api/rooms/my-rooms`, {
         headers: {
           'Authorization': `Bearer ${user.token}`
         }
      });
      
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return await res.json();
    },
    enabled: !!user?.token,
  });
}

export function useCreateRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, videoUrl }: { name: string; videoUrl?: string }) => {
      if (!user?.token) throw new Error('Not authenticated');

      const response = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name, videoUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      return data.room; 
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
      if (!user?.token) throw new Error('Not authenticated');
      
      // We don't need a specific POST join for now, as joining happens via WebSockets in the backend automatically, 
      // but we do want to verify the room exists.
      const response = await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      
      if (!response.ok) {
        throw new Error('Room not found or access denied');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
    },
  });
}
