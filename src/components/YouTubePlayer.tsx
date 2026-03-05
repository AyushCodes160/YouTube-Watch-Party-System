import { useEffect, useRef } from 'react';
import { loadYouTubeAPI, extractVideoId, YT_PLAYER_STATE, type VideoState } from '@/lib/youtube';

interface YouTubePlayerProps {
  videoState: VideoState;
  isSyncingRef: React.MutableRefObject<boolean>;
  canControl: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
}

export function YouTubePlayer({
  videoState,
  isSyncingRef,
  canControl,
  onPlay,
  onPause,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekDebounce = useRef<ReturnType<typeof setTimeout>>();

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
          controls: 1,
          disablekb: canControl ? 0 : 1,
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
            if (isSyncingRef.current) return;

            const currentTime = event.target.getCurrentTime();

            // If user can't control, revert any play/pause changes
            if (!canControl) {
              isSyncingRef.current = true;
              if (videoState.state === 'playing' && event.data === YT_PLAYER_STATE.PAUSED) {
                event.target.playVideo();
              } else if (videoState.state === 'paused' && event.data === YT_PLAYER_STATE.PLAYING) {
                event.target.pauseVideo();
              }
              setTimeout(() => { isSyncingRef.current = false; }, 500);
              return;
            }

            switch (event.data) {
              case YT_PLAYER_STATE.PLAYING:
                // Cancel any pending pause detection (it was a seek, not a real pause)
                clearTimeout(seekDebounce.current);
                onPlay(currentTime);
                break;
              case YT_PLAYER_STATE.PAUSED:
                // Debounce: wait 300ms then check if still paused.
                // If user was seeking (brief pause → play), the PLAYING handler
                // above will cancel this timeout before it fires.
                clearTimeout(seekDebounce.current);
                seekDebounce.current = setTimeout(() => {
                  const playerState = event.target.getPlayerState();
                  if (playerState === YT_PLAYER_STATE.PAUSED) {
                    onPause(event.target.getCurrentTime());
                  }
                }, 300);
                break;
            }
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
      if (Math.abs(currentTime - videoState.currentTime) > 1) {
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
    </div>
  );
}
