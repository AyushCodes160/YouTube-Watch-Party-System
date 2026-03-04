/**
 * YouTube utility functions for URL parsing and IFrame API integration.
 */

/**
 * Extracts a YouTube video ID from various URL formats.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
    /youtube\.com\/shorts\/([^?\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // bare video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * YouTube Player State constants (mirrors YT.PlayerState)
 */
export const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export interface VideoState {
  state: 'playing' | 'paused' | 'buffering';
  currentTime: number;
  videoId?: string;
  updatedAt?: number;
}

/**
 * Loads the YouTube IFrame API script dynamically.
 * Returns a promise that resolves when the API is ready.
 */
export function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).YT?.Player) {
      resolve();
      return;
    }

    const existing = document.getElementById('youtube-iframe-api');
    if (existing) {
      // Script already loading, wait for callback
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      return;
    }

    (window as any).onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
}
