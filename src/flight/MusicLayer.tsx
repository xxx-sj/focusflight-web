import { useFlightStore } from '../store/flightStore';
import { youtubeIdFromTrack } from '../lib/youtube';

/**
 * Renders a hidden YouTube iframe while the user is in-flight AND has a
 * YouTube track selected. The plain <iframe> approach (with explicit
 * allow="autoplay") is more reliable than the IFrame Player API for autoplay,
 * at the cost of programmatic volume control — users can adjust the tab
 * volume from the browser if needed.
 *
 * Preset (mp3) tracks are handled imperatively by AudioBus.
 */
export default function MusicLayer() {
  const active = useFlightStore((s) => s.active);
  const inFlight = active?.step === 'inflight';
  const ytId = inFlight ? youtubeIdFromTrack(active?.lofiTrack) : null;

  if (!ytId) return null;

  // Loop trick: `playlist=<id>` + `loop=1` is YouTube's documented way to loop
  // a single video.
  const src = `https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0`;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: -400,
        left: -400,
        width: 320,
        height: 180,
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      <iframe
        key={ytId}
        src={src}
        title="In-flight music"
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
}
