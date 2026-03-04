import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWatchParty } from '@/hooks/useWatchParty';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { ParticipantsSidebar } from '@/components/ParticipantsSidebar';
import { extractVideoId, type VideoState } from '@/lib/youtube';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Link as LinkIcon,
  Play,
  Pause,
  Tv,
  Wifi,
  WifiOff,
  LogOut,
  Video,
} from 'lucide-react';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
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
  } = useWatchParty(roomId!);

  const [videoUrlInput, setVideoUrlInput] = useState('');
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

  const handleSeek = useCallback(
    (currentTime: number) => {
      broadcastAction({
        state: videoState.state,
        currentTime,
        videoId: videoState.videoId,
        updatedAt: Date.now(),
      });
    },
    [broadcastAction, videoState.state, videoState.videoId]
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

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-primary" />
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
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleLeave}>
              <LogOut className="mr-2 h-3.5 w-3.5" /> Leave
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 p-4">
        {/* Video Area */}
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
            onSeek={handleSeek}
          />

          {/* Controls - only for host/moderator */}
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

        {/* Sidebar */}
        <div className="hidden w-72 shrink-0 md:block">
          <ParticipantsSidebar
            participants={participants}
            myRole={myRole}
            currentUserId={user?._id}
            onUpdateRole={updateRole}
            onRemoveParticipant={removeParticipant}
          />
        </div>
      </div>
    </div>
  );
}
