import { useEffect, useRef } from 'react';
import { useFlightStore } from '../store/flightStore';
import { useSettingsStore } from '../store/settingsStore';
import { youtubeIdFromTrack } from '../lib/youtube';

// Module-level loader so the IFrame API is fetched at most once.
let apiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const w = window as unknown as { YT?: { Player: unknown }; onYouTubeIframeAPIReady?: () => void };
    if (w.YT && w.YT.Player) {
      resolve();
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      try { prev?.(); } catch { /* ignore */ }
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  });
  return apiPromise;
}

/**
 * Renders a hidden YouTube iframe player while the user is in-flight AND has
 * a YouTube track selected. Volume is synced with the settings musicVolume.
 *
 * Preset (mp3) tracks are handled separately by AudioBus.
 */
export default function MusicLayer() {
  const active = useFlightStore((s) => s.active);
  const musicVolume = useSettingsStore((s) =>
    s.settings.soundEnabled ? s.settings.musicVolume : 0
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{ destroy: () => void; setVolume: (v: number) => void; playVideo: () => void } | null>(null);

  const inFlight = active?.step === 'inflight';
  const ytId = inFlight ? youtubeIdFromTrack(active?.lofiTrack) : null;

  useEffect(() => {
    if (!ytId) {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: ytId,
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: ytId,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        events: {
          onReady: (e: { target: { setVolume: (v: number) => void; playVideo: () => void } }) => {
            e.target.setVolume(Math.round(musicVolume * 100));
            e.target.playVideo();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, [ytId]);

  // Sync volume changes
  useEffect(() => {
    if (playerRef.current?.setVolume) {
      try { playerRef.current.setVolume(Math.round(musicVolume * 100)); } catch { /* ignore */ }
    }
  }, [musicVolume]);

  return (
    <div style={{ position: 'fixed', top: -300, left: -300, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
      <div ref={containerRef} />
    </div>
  );
}
