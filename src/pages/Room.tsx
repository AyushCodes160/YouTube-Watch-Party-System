import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Link as LinkIcon,
  Play,
  Pause,
  Wifi,
  WifiOff,
  LogOut,
  Video,
  MessageSquare,
  Users,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useDeleteRoom } from '@/hooks/useRooms'; // Added useDeleteRoom import
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { ParticipantsSidebar } from '@/components/ParticipantsSidebar';
import { ChatBox } from '@/components/ChatBox';
import { extractVideoId } from '@/lib/youtube';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const deleteRoom = useDeleteRoom(); // Initialized useDeleteRoom

  const [videoUrlInput, setVideoUrlInput] = useState('');
  
  const {
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
    leaveRoom,
  } = useWatchParty(roomId!);

  const canControl = myRole === 'host' || myRole === 'moderator';

  const handlePlay = useCallback(
    (currentTime: number) => {
      broadcastAction({
        state: 'playing',
        currentTime,
        videoId: videoState.videoId,
        updatedAt: Date.now(),
      });
    },
    [broadcastAction, videoState.videoId]
  );

  const handlePause = useCallback(
    (currentTime: number) => {
      broadcastAction({
        state: 'paused',
        currentTime,
        videoId: videoState.videoId,
        updatedAt: Date.now(),
      });
    },
    [broadcastAction, videoState.videoId]
  );

  const handleChangeVideo = () => {
    const id = extractVideoId(videoUrlInput);
    if (!id) {
      toast.error('Invalid YouTube URL');
      return;
    }
    broadcastAction({
      state: 'paused',
      currentTime: 0,
      videoId: id,
      updatedAt: Date.now(),
    });
    setVideoUrlInput('');
    toast.success('Video changed!');
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate('/dashboard');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomId!);
    toast.success('Room ID copied!');
  };

  const handleDeleteRoom = async () => {
    if (window.confirm('Are you sure you want to delete this room for everyone?')) {
      try {
        await deleteRoom.mutateAsync(roomId!);
        navigate('/dashboard');
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  if (!room) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050508] relative overflow-hidden text-white font-sans selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] h-[700px] w-[700px] rounded-full bg-primary/10 blur-[130px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-[#FF0000] fill-[#FF0000]" />
                <h1 className="text-lg font-semibold">{room.name}</h1>
              </div>
              <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
                {isConnected ? (
                  <><Wifi className="mr-1 h-3 w-3" /> Live</>
                ) : (
                  <><WifiOff className="mr-1 h-3 w-3" /> Disconnected</>
                )}
              </Badge>
              {myRole && (
                <Badge variant="outline" className="text-xs capitalize">
                  {myRole}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Share ID
              </Button>
              {myRole === 'host' ? (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleDeleteRoom}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Room
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={handleLeave}>
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Leave
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-4 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col gap-4"
          >
            <YouTubePlayer
              videoState={videoState}
              isSyncingRef={isSyncingRef}
              canControl={canControl}
              onPlay={handlePlay}
              onPause={handlePause}
            />

            {canControl && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Paste YouTube URL to change video..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleChangeVideo()}
                  />
                  <Button size="sm" onClick={handleChangeVideo} disabled={!videoUrlInput.trim()}>
                    Change Video
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          <div className="hidden w-80 shrink-0 flex-col md:flex">
            <Tabs defaultValue="chat" className="flex h-full flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="participants">
                  <Users className="mr-2 h-4 w-4" />
                  Duo ({participants.filter(p => p.online).length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="mt-2 flex-1 outline-none data-[state=inactive]:hidden">
                <ChatBox
                  messages={messages}
                  currentUserId={user?._id}
                  onSendMessage={sendMessage}
                />
              </TabsContent>
              
              <TabsContent value="participants" className="mt-2 flex-1 outline-none data-[state=inactive]:hidden">
                <ParticipantsSidebar
                  participants={participants}
                  myRole={myRole}
                  currentUserId={user?._id}
                  onUpdateRole={updateRole}
                  onRemoveParticipant={removeParticipant}
                  onTransferHost={transferHost}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
