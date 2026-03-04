import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Plus, ArrowRight, Tv, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function Lobby() {
  const { user, username, signOut } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const createRoom = async () => {
    if (!roomName.trim() || !user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({ name: roomName.trim().slice(0, 100), host_id: user.id })
        .select()
        .single();
      if (error) throw error;
      toast.success('Room created!');
      navigate(`/room/${data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', joinCode.trim().toLowerCase())
        .single();
      if (error || !data) throw new Error('Room not found');
      navigate(`/room/${data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Tv className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">WatchParty</h1>
              <p className="text-xs text-muted-foreground">Hi, {username}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Sign Out
          </Button>
        </div>

        {/* Create Room */}
        <div className="glass rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Create a Room
          </h2>
          <div className="flex gap-2">
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room name..."
              className="bg-secondary border-border"
              maxLength={100}
              onKeyDown={(e) => e.key === 'Enter' && createRoom()}
            />
            <Button onClick={createRoom} disabled={creating || !roomName.trim()}>
              {creating ? '...' : 'Create'}
            </Button>
          </div>
        </div>

        {/* Join Room */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-accent" /> Join a Room
          </h2>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter room code..."
              className="bg-secondary border-border font-mono"
              maxLength={10}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
            <Button variant="secondary" onClick={joinRoom} disabled={joining || !joinCode.trim()}>
              {joining ? '...' : 'Join'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
