export type LofiTrack = {
  id: string;
  label: string;
  url: string;
  description: string;
};

export const LOFI_TRACKS: LofiTrack[] = [
  {
    id: 'cafe',
    label: '☕ Cafe',
    url: '/lofi/cafe.mp3',
    description: '럼블 + 보이스밴드 머머 + 클링크',
  },
  {
    id: 'rain',
    label: '🌧 Rain',
    url: '/lofi/rain.mp3',
    description: '강한 빗소리 + 낮은 천둥 럼블',
  },
  {
    id: 'wind',
    label: '🌬 Low Wind',
    url: '/lofi/wind.mp3',
    description: '저주파 바람 (서브베이스)',
  },
  {
    id: 'highs',
    label: '🍃 High Tones',
    url: '/lofi/highs.mp3',
    description: '고주파 잎사귀/공기 사운드',
  },
];

export function findTrack(id: string | null | undefined): LofiTrack | null {
  if (!id) return null;
  return LOFI_TRACKS.find(t => t.id === id) ?? null;
}
