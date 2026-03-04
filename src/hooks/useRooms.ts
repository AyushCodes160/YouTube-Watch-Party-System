import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function useMyRooms() {
  // For this MVP, we omit listing all persistent rooms since the backend is memory-based
  return { data: [], isLoading: false };
}

export function useCreateRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, videoUrl }: { name: string; videoUrl?: string }) => {
      // Create user id for anonymous if not logged in
      const finalUserId = user?.id || `anon_${Math.random().toString(36).substr(2, 9)}`;
      const finalUsername = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Anonymous';

      const response = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: finalUserId,
          hostUsername: finalUsername,
          name: name,
          videoUrl: videoUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      return data.room; // returns the created room from backend
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
    },
  });
}

export function useJoinRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = await fetch(`${SERVER_URL}/api/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('Room not found');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
    },
  });
}
