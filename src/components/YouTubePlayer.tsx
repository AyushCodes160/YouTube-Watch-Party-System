import { useEffect, useRef, useCallback, useState } from 'react';
import { loadYouTubeAPI } from '@/lib/youtube';

interface YouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  playbackTime: number;
  canControl: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  lastSyncedAt: string;
}

export function YouTubePlayer({
  videoId,
  isPlaying,
  playbackTime,
  canControl,
  onPlay,
  onPause,
  onSeek,
  lastSyncedAt,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef(lastSyncedAt);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [ready, setReady] = useState(false);

  // Initialize player
  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;

    const init = async () => {
      await loadYouTubeAPI();
      if (cancelled || !containerRef.current) return;

      // Destroy existing player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: canControl ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(playbackTime),
        },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
          onStateChange: (event: any) => {
            if (isSyncingRef.current || !canControl) return;

            const YT = (window as any).YT;
            const state = event.data;

            if (state === YT.PlayerState.PLAYING) {
              onPlay();
              // Also sync current time
              const currentTime = playerRef.current?.getCurrentTime?.() || 0;
              onSeek(currentTime);
            } else if (state === YT.PlayerState.PAUSED) {
              onPause();
              const currentTime = playerRef.current?.getCurrentTime?.() || 0;
              onSeek(currentTime);
            }
          },
        },
      });
    };

    init();
    return () => { cancelled = true; };
  }, [videoId]); // Only reinit on video change

  // Sync playback state from server
  useEffect(() => {
    if (!ready || !playerRef.current || lastSyncedAt === lastSyncRef.current) return;
    lastSyncRef.current = lastSyncedAt;

    isSyncingRef.current = true;

    const player = playerRef.current;
    const YT = (window as any).YT;

    try {
      // Seek to correct position
      const currentPlayerTime = player.getCurrentTime?.() || 0;
      if (Math.abs(currentPlayerTime - playbackTime) > 2) {
        player.seekTo(playbackTime, true);
      }

      // Sync play/pause
      const playerState = player.getPlayerState?.();
      if (isPlaying && playerState !== YT.PlayerState.PLAYING) {
        player.playVideo();
      } else if (!isPlaying && playerState === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      }
    } catch (e) {
      console.error('Sync error:', e);
    }

    // Release sync lock after a short delay
    setTimeout(() => { isSyncingRef.current = false; }, 500);
  }, [isPlaying, playbackTime, lastSyncedAt, ready]);

  if (!videoId) {
    return (
      <div className="w-full aspect-video rounded-xl bg-secondary flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No video loaded. {canControl ? 'Paste a YouTube URL above.' : 'Waiting for host...'}</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-secondary relative">
      <div ref={containerRef} className="w-full h-full" />
      {!canControl && (
        <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto' }} onClick={(e) => e.preventDefault()} />
      )}
    </div>
  );
}
