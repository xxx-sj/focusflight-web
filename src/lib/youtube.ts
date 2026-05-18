// Extracts an 11-char YouTube video ID from common URL shapes.
// Returns null if no valid ID is found.

const PATTERNS: RegExp[] = [
  /[?&]v=([a-zA-Z0-9_-]{11})/,                  // watch?v=...
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,             // youtu.be/...
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,   // /embed/...
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,  // /shorts/...
  /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,    // /live/...
];

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Bare ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  for (const p of PATTERNS) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}

export const YT_PREFIX = 'yt:';

export function isYouTubeTrack(track: string | null | undefined): track is string {
  return !!track && track.startsWith(YT_PREFIX);
}

export function youtubeIdFromTrack(track: string | null | undefined): string | null {
  if (!isYouTubeTrack(track)) return null;
  return track.slice(YT_PREFIX.length);
}
