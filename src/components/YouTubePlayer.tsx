import { useEffect, useRef, useState } from 'react';
import { loadYouTubeAPI, extractVideoId, YT_PLAYER_STATE, type VideoState } from '@/lib/youtube';
import { Maximize, Play } from 'lucide-react';

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const seekDebounce = useRef<ReturnType<typeof setTimeout>>();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    let destroyed = false;

    async function init() {
      if (!videoState.videoId) return;

      await loadYouTubeAPI();
      if (destroyed || !containerRef.current) return;

      const videoId = videoState.videoId;

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: canControl ? 1 : 0,
          disablekb: canControl ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
        },
        events: {
          onReady: (event: any) => {
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
                clearTimeout(seekDebounce.current);
                onPlay(currentTime);
                break;
              case YT_PLAYER_STATE.PAUSED:
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
  }, [videoState.videoId, canControl]); // Added canControl dependency

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.getPlayerState || !videoState.videoId) return;

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
  }, [videoState.state, videoState.currentTime, videoState.updatedAt]);

  if (!videoState.videoId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-dashed border-border/50 bg-card/30 flex flex-col items-center justify-center text-center p-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Play className="h-8 w-8 text-[#FF0000] fill-[#FF0000]" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No video loaded</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Paste a YouTube link in the URL bar above to start the party!
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-card">
      <div ref={containerRef} className="h-full w-full" />
      {!canControl && (
        <>
          <div className="absolute inset-0 z-10" />
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 z-20 rounded-md bg-black/70 p-2 text-white transition-colors hover:bg-black/90"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <Maximize className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
