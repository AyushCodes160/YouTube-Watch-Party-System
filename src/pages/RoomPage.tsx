import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import { useAuth } from '@/hooks/useAuth';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { ChatPanel } from '@/components/ChatPanel';
import { ParticipantsList } from '@/components/ParticipantsList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { extractVideoId } from '@/lib/youtube';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Tv, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    room, participants, messages, myRole, canControl,
    loading, error, joinRoom, leaveRoom, sendMessage,
    updateVideoState, assignRole, removeParticipant,
  } = useRoom(id);
  
  const [videoUrl, setVideoUrl] = useState('');
  const [joined, setJoined] = useState(false);

  // Auto-join on mount
  useEffect(() => {
    if (room && user && !joined) {
      joinRoom().then(() => setJoined(true));
    }
  }, [room, user, joined, joinRoom]);

  const handleChangeVideo = useCallback(() => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) { toast.error('Invalid YouTube URL'); return; }
    updateVideoState({ video_id: videoId, video_url: videoUrl, playback_time: 0, is_playing: false });
    setVideoUrl('');
    toast.success('Video updated!');
  }, [videoUrl, updateVideoState]);

  const handleLeave = async () => {
    await leaveRoom();
    navigate('/');
  };

  const copyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      toast.success(`Room code copied: ${room.code}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Room not found'}</p>
          <Button onClick={() => navigate('/')}>Back to Lobby</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0"
      >
        <Button variant="ghost" size="icon" onClick={handleLeave}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Tv className="w-4 h-4 text-primary" />
        <span className="font-semibold truncate">{room.name}</span>
        <Button variant="ghost" size="sm" onClick={copyCode} className="font-mono text-xs gap-1">
          <Copy className="w-3 h-3" />
          {room.code}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
            {myRole}
          </span>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col p-4 overflow-auto">
          {/* Video URL input for controllers */}
          {canControl && (
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste YouTube URL..."
                  className="bg-secondary border-border pl-9 font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleChangeVideo()}
                />
              </div>
              <Button onClick={handleChangeVideo} disabled={!videoUrl.trim()}>
                Load
              </Button>
            </div>
          )}

          {/* Player */}
          <YouTubePlayer
            videoId={room.video_id}
            isPlaying={room.is_playing}
            playbackTime={room.playback_time}
            canControl={canControl}
            lastSyncedAt={room.last_synced_at}
            onPlay={() => updateVideoState({ is_playing: true })}
            onPause={() => updateVideoState({ is_playing: false })}
            onSeek={(time) => updateVideoState({ playback_time: time })}
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-border flex flex-col shrink-0 hidden md:flex">
          <div className="h-1/2 border-b border-border">
            <ParticipantsList
              participants={participants}
              myRole={myRole}
              currentUserId={user?.id || ''}
              onAssignRole={assignRole}
              onRemove={removeParticipant}
            />
          </div>
          <div className="h-1/2">
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              currentUserId={user?.id || ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
