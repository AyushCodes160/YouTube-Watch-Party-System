import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyRooms, useCreateRoom, useJoinRoom, useDeleteRoom } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, LogIn, LogOut, Play, Users, Clock, Copy, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: rooms, isLoading } = useMyRooms();
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const deleteRoom = useDeleteRoom();
  const navigate = useNavigate();

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomVideo, setNewRoomVideo] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      try {
        await deleteRoom.mutateAsync(roomId);
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const handleCreate = async () => {
    if (!newRoomName.trim()) {
      toast.error('Room name is required');
      return;
    }
    try {
      const room = await createRoom.mutateAsync({ name: newRoomName.trim(), videoUrl: newRoomVideo.trim() || undefined });
      setCreateOpen(false);
      setNewRoomName('');
      setNewRoomVideo('');
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleJoin = async () => {
    const id = joinRoomId.trim();
    if (!id) {
      toast.error('Enter a room ID');
      return;
    }
    try {
      await joinRoom.mutateAsync(id);
      setJoinOpen(false);
      setJoinRoomId('');
      navigate(`/room/${id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const roleBadgeVariant = (role: string) => {
    if (role === 'host') return 'default';
    if (role === 'moderator') return 'secondary';
    return 'outline';
  };

  return (
    <div className="min-h-[100dvh] bg-[#050508] relative overflow-hidden text-white font-sans selection:bg-primary/30">
      {/* Background Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] h-[700px] w-[700px] rounded-full bg-primary/10 blur-[130px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF0000]">
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Watch Party</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Actions */}
          <div className="mb-8 flex flex-wrap gap-3">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary glow-primary">
                  <Plus className="mr-2 h-4 w-4" /> Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Watch Party</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Room Name</Label>
                    <Input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Movie Night 🍿" />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube URL (optional)</Label>
                    <Input value={newRoomVideo} onChange={(e) => setNewRoomVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={createRoom.isPending}>
                    {createRoom.isPending ? 'Creating...' : 'Create & Join'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LogIn className="mr-2 h-4 w-4" /> Join Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Room ID</Label>
                    <Input value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} placeholder="Paste room ID here" />
                  </div>
                  <Button onClick={handleJoin} className="w-full" disabled={joinRoom.isPending}>
                    {joinRoom.isPending ? 'Joining...' : 'Join Room'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Room List */}
          <h2 className="mb-4 text-lg font-semibold">Your Rooms</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !rooms?.length ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Play className="mb-4 h-12 w-12 text-[#FF0000]/50 fill-[#FF0000]/20" />
                <p className="text-muted-foreground">No rooms yet. Create or join one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room: any, i: number) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="cursor-pointer border-border/50 transition-all hover:border-primary/30 hover:glow-primary"
                    onClick={() => navigate(`/room/${room.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{room.name}</CardTitle>
                        <Badge variant={roleBadgeVariant(room._role)}>{room._role}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(room.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(room.id);
                              toast.success('Room ID copied!');
                            }}
                          >
                            <Copy className="h-3 w-3" /> Copy ID
                          </button>
                          {room._role === 'host' ? (
                            <button
                              className="flex items-center gap-1 text-destructive/70 hover:text-destructive transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete this room for everyone? This cannot be undone.')) {
                                  deleteRoom.mutate(room.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          ) : (
                            <button
                              className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Remove this room from your history? You can rejoin if you have the ID.')) {
                                  deleteRoom.mutate(room.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
      </div>
    </div>
  );
}
