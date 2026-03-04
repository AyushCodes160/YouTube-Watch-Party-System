import { useEffect, useRef, useCallback } from 'react';
import { loadYouTubeAPI, extractVideoId, YT_PLAYER_STATE, type VideoState } from '@/lib/youtube';

interface YouTubePlayerProps {
  videoState: VideoState;
  isSyncingRef: React.MutableRefObject<boolean>;
  canControl: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
}

export function YouTubePlayer({
  videoState,
  isSyncingRef,
  canControl,
  onPlay,
  onPause,
  onSeek,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekDebounce = useRef<ReturnType<typeof setTimeout>>();
  const lastSeekTime = useRef(0);

  // Initialize player
  useEffect(() => {
    let destroyed = false;

    async function init() {
      await loadYouTubeAPI();
      if (destroyed || !containerRef.current) return;

      const videoId = videoState.videoId || extractVideoId('') || 'dQw4w9WgXcQ';

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: canControl ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          fs: 1,
        },
        events: {
          onReady: (event: any) => {
            // Sync initial state
            if (videoState.currentTime > 0) {
              event.target.seekTo(videoState.currentTime, true);
            }
            if (videoState.state === 'playing') {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (isSyncingRef.current || !canControl) return;

            const currentTime = event.target.getCurrentTime();

            switch (event.data) {
              case YT_PLAYER_STATE.PLAYING:
                onPlay(currentTime);
                break;
              case YT_PLAYER_STATE.PAUSED:
                // Check if this is a seek (time difference > 1s from last known time)
                if (Math.abs(currentTime - lastSeekTime.current) > 1) {
                  clearTimeout(seekDebounce.current);
                  seekDebounce.current = setTimeout(() => {
                    onSeek(currentTime);
                  }, 300);
                } else {
                  onPause(currentTime);
                }
                break;
            }
            lastSeekTime.current = currentTime;
          },
        },
      });
    }

    init();

    return () => {
      destroyed = true;
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
    // Only re-init on videoId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.videoId]);

  // Sync state changes from remote
  useEffect(() => {
    const player = playerRef.current;
    if (!player?.getPlayerState) return;

    isSyncingRef.current = true;

    if (videoState.currentTime !== undefined) {
      const currentTime = player.getCurrentTime();
      if (Math.abs(currentTime - videoState.currentTime) > 2) {
        player.seekTo(videoState.currentTime, true);
      }
    }

    if (videoState.state === 'playing') {
      player.playVideo();
    } else if (videoState.state === 'paused') {
      player.pauseVideo();
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.state, videoState.currentTime, videoState.updatedAt]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-card">
      <div ref={containerRef} className="h-full w-full" />
      {!canControl && (
        <div className="pointer-events-none absolute inset-0" />
      )}
    </div>
  );
}
