import { useEffect, useRef } from 'react';
import { useFlightStore } from '../store/flightStore';
import { useSettingsStore } from '../store/settingsStore';
import { audioBus } from '../lib/audio';
import { findTrack } from '../lofi';
import { youtubeIdFromTrack } from '../lib/youtube';

const hiddenStyle: React.CSSProperties = {
  position: 'fixed',
  top: -400,
  left: -400,
  width: 320,
  height: 180,
  opacity: 0,
  pointerEvents: 'none',
};

/**
 * Declarative music playback layer. Mounts the appropriate <audio> element or
 * YouTube <iframe> while the user is in-flight AND a track is selected.
 *
 * Why declarative? Browsers (especially Safari/Mobile) reject programmatic
 * audio.play() calls that aren't synchronously rooted in a user gesture, and
 * Framer Motion's drag-end callback doesn't always preserve that gesture.
 * <audio autoplay> uses the browser's "page is engaged" heuristic instead and
 * is far more reliable once the user has interacted at all.
 */
export default function MusicLayer() {
  const active = useFlightStore((s) => s.active);
  const musicVolume = useSettingsStore((s) =>
    s.settings.soundEnabled ? s.settings.musicVolume : 0
  );

  const inFlight = active?.step === 'inflight';
  const preset = inFlight ? findTrack(active?.lofiTrack) : null;
  const ytId = inFlight ? youtubeIdFromTrack(active?.lofiTrack) : null;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync volume changes to the preset <audio> element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume;
  }, [musicVolume]);

  // Tell the FX bus when music is active so it can duck the engine.
  useEffect(() => {
    audioBus.setMusicActive(!!(preset || ytId));
    return () => audioBus.setMusicActive(false);
  }, [preset, ytId]);

  return (
    <>
      {preset && (
        <audio
          key={preset.id}
          ref={(el) => {
            audioRef.current = el;
            if (el) el.volume = musicVolume;
          }}
          src={preset.url}
          loop
          autoPlay
          // Render off-screen so it's not interactive but the element stays in
          // the DOM tree for autoplay to be honored.
          style={hiddenStyle as React.CSSProperties}
        />
      )}
      {ytId && (
        <div style={hiddenStyle}>
          <iframe
            key={ytId}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0`}
            title="In-flight music"
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        </div>
      )}
    </>
  );
}
