# FocusFlight Web Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브라우저에서 동작하는 개인용 집중 타이머. 비행 의식 UX(예약→좌석→보딩패스→체크인→인플라이트→착륙)를 핵심으로, 통계 대시보드와 몰입형 사운드를 포함한 정적 SPA를 만들어 Vercel/Cloudflare Pages에 배포한다.

**Architecture:** Vite + React 18 SPA. 의식 플로우는 `/` 라우트 위에서 동작하는 상태 머신(Zustand)으로, `/stats`·`/settings`는 별도 라우트. 모든 데이터는 localStorage에 영속화하며 새로고침 시 진행 중인 비행을 복구한다. 사운드는 Web Audio API + GainNode로 마스터 볼륨 제어, 시각 효과는 Framer Motion.

**Tech Stack:** Vite 5, React 18, TypeScript, Tailwind CSS 3, Framer Motion 11, Zustand 4, React Router 6, Recharts 2, Vitest, React Testing Library, jsdom

**Spec:** [`docs/specs/2026-05-18-focusflight-web-design.md`](../specs/2026-05-18-focusflight-web-design.md)

---

## File Structure

각 파일은 하나의 책임만 가진다. 큰 파일이 생기면 분할한다.

### Core types & storage (M1)
- `src/types.ts` — `Flight`, `Category`, `Settings`, `ActiveFlight`, `FlightStep` 타입
- `src/lib/id.ts` — `nanoid()` 래퍼, 단순 id 생성
- `src/lib/storage.ts` — localStorage CRUD + 스키마 마이그레이션 + seed-merge
- `src/lib/storage.test.ts` — 저장/복구/누락 필드 merge 테스트

### Timer & stats (M1)
- `src/lib/timer.ts` — `Date.now()` 기반 elapsed/remaining 계산
- `src/lib/timer.test.ts` — 시작/일시정지/시계 변경 견딤
- `src/lib/stats.ts` — `Flight[]` → KPI / weekly / category breakdown
- `src/lib/stats.test.ts` — streak 엣지 + history 1000 초과 + 자정 경계

### State stores (M1)
- `src/store/flightStore.ts` — Zustand: ActiveFlight + history 액션
- `src/store/flightStore.test.ts` — state transitions
- `src/store/settingsStore.ts` — Zustand: Settings + persist via storage.ts

### Routing & shell (M1)
- `src/main.tsx` — React entry
- `src/App.tsx` — Router 정의
- `src/routes/Home.tsx` — 의식 호스트
- `src/routes/Stats.tsx` — 통계 페이지
- `src/routes/Settings.tsx` — 설정 페이지
- `index.html`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `package.json`

### Flight ritual flow (M2)
- `src/flight/FlightMachine.tsx` — step 분기 + Framer Motion AnimatePresence
- `src/flight/steps/Booking.tsx` — 시간/카테고리 선택
- `src/flight/steps/SeatSelection.tsx` — 3-6 그리드, 10열 좌석 맵
- `src/flight/steps/BoardingPass.tsx` — 발권된 티켓 카드
- `src/flight/steps/CheckIn.tsx` — stub drag-to-tear
- `src/flight/steps/InFlight.tsx` — 풀스크린 카운트다운
- `src/flight/steps/Landed.tsx` — 완료 화면
- `src/flight/ResumeModal.tsx` — 새로고침 복구

### Reusable components (M2/M4)
- `src/components/BoardingPassCard.tsx` — 보딩패스 UI (CheckIn + InFlight 공유)
- `src/components/SeatMap.tsx` — 좌석 맵 (SeatSelection 사용)
- `src/components/Countdown.tsx` — 큰 시:분:초 디스플레이
- `src/components/KpiCard.tsx` — 통계 카드
- `src/components/charts/WeeklyBar.tsx` — Recharts 막대
- `src/components/charts/CategoryDonut.tsx` — Recharts 도넛

### Sound system (M6)
- `src/lib/audio.ts` — AudioContext + GainNode + 사운드 로더/플레이어
- `src/lib/audio.test.ts` — 게인/볼륨/fallback (jsdom mock)
- `public/sounds/{takeoff,engine,landing,tear}.mp3`
- `public/sounds/CREDITS.md`

### Notifications & polish (M5/M7)
- `src/lib/notifications.ts` — Notification API wrapper
- `src/styles/globals.css` — Tailwind 베이스 + 커스텀 keyframes

### Integration tests (각 마일스톤)
- `tests/flight-full-flow.test.tsx` — booking → landed
- `tests/resume-flow.test.tsx` — active 복구 시나리오
- `tests/sound-cues.test.tsx` — 전환별 사운드 호출
- `tests/stats-empty.test.tsx` / `stats-with-data.test.tsx`

---

## 작업 컨벤션

- **TDD**: 모든 task는 실패 테스트 → 최소 구현 → 통과 → 커밋 순서.
- **커밋 단위**: 한 task = 한 커밋. 메시지는 conventional commits (`feat:`, `test:`, `chore:` 등).
- **테스트 파일 변경 커밋 전**: `test-reviewer` 호출 (CLAUDE.md 가드레일).
- **각 마일스톤 종료 시**: `npm run build` 통과 + 모든 테스트 green 확인 후 다음 마일스톤으로.
- **참조 skills**: `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`.

---

## Chunk 1: M1 — Project Skeleton

**목표**: Vite + React + TS 초기화, Tailwind/Zustand/Router 셋업, core lib(storage/timer/stats)과 store 작성. 빈 라우트 3개가 동작하고 모든 단위 테스트가 통과한다.

### Task 1.1: Vite 프로젝트 초기화

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Vite 스캐폴드 실행**

```bash
cd /Users/overlay/Documents/workspace/resume/sound-project/focusflight-web
npm create vite@latest . -- --template react-ts
```

플롬프트가 뜨면 현재 디렉토리에 생성 확인. `docs/`는 보존됨.

- [ ] **Step 2: 의존성 설치**

```bash
npm install
npm install react-router-dom zustand framer-motion recharts nanoid clsx
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
```

- [ ] **Step 3: Tailwind init**

```bash
npx tailwindcss init -p
```

`tailwind.config.js` content 배열에 `"./index.html", "./src/**/*.{ts,tsx}"` 추가.

- [ ] **Step 4: 기본 동작 확인**

```bash
npm run dev
```

브라우저에서 Vite 기본 화면 뜨는지 확인. 종료 후 진행.

- [ ] **Step 5: Vitest 설정**

`vite.config.ts`에 test 블록 추가:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
```

`src/test-setup.ts` 생성:

```ts
import '@testing-library/jest-dom/vitest';
```

`package.json` scripts에 `"test": "vitest"` 추가.

- [ ] **Step 6: 빌드 확인**

```bash
npm run build
```

`dist/` 생성되면 OK.

- [ ] **Step 7: Commit**

```bash
git init
echo "node_modules\ndist\n.DS_Store" > .gitignore
git add -A
git commit -m "chore: scaffold vite + react + ts + tailwind + vitest"
```

### Task 1.2: 타입 정의

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: 타입 작성**

```ts
// src/types.ts

export type FlightStep = 'booking' | 'seat' | 'boarding' | 'checkin' | 'inflight' | 'landed';

export type Flight = {
  id: string;
  category: string;
  plannedSeconds: number;
  actualSeconds: number;
  seat: string;
  startedAt: number;
  completedAt: number | null;
  status: 'completed' | 'aborted';
};

export type Category = {
  id: string;
  label: string;
  color: string;
};

export type Settings = {
  categories: Category[];
  defaultDurationMinutes: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  volume: number;
};

export type ActiveFlight = {
  step: FlightStep;
  flight: Partial<Flight>;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: define core types (Flight, Settings, ActiveFlight)"
```

### Task 1.3: storage.ts — localStorage 추상화 (TDD)

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './storage';

describe('storage:settings', () => {
  beforeEach(() => localStorage.clear());

  it('returns DEFAULT_SETTINGS when nothing stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a saved Settings object', () => {
    const s = { ...DEFAULT_SETTINGS, volume: 0.3 };
    saveSettings(s);
    expect(loadSettings()).toEqual(s);
  });

  it('seed-merges missing keys into stored settings', () => {
    // legacy: stored without `volume`
    const { volume, ...legacy } = DEFAULT_SETTINGS;
    localStorage.setItem('focusflight:settings', JSON.stringify(legacy));
    expect(loadSettings().volume).toBe(DEFAULT_SETTINGS.volume);
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('focusflight:settings', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test -- storage.test
```

Expected: FAIL ("Cannot find module './storage'")

- [ ] **Step 3: 최소 구현**

```ts
// src/lib/storage.ts
import type { Settings, Flight, ActiveFlight } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  categories: [
    { id: 'work', label: '일', color: '#F4A261' },
    { id: 'study', label: '공부', color: '#2A9D8F' },
    { id: 'reading', label: '독서', color: '#E76F51' },
  ],
  defaultDurationMinutes: 25,
  notificationsEnabled: false,
  soundEnabled: true,
  volume: 0.6,
};

const KEY_SETTINGS = 'focusflight:settings';
const KEY_HISTORY = 'focusflight:history';
const KEY_ACTIVE = 'focusflight:active';
const KEY_VERSION = 'focusflight:schemaVersion';
const CURRENT_VERSION = 1;
const HISTORY_LIMIT = 1000;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSettings(): Settings {
  const stored = readJSON<Partial<Settings> | null>(KEY_SETTINGS, null);
  if (!stored) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  localStorage.setItem(KEY_VERSION, String(CURRENT_VERSION));
}

export function loadHistory(): Flight[] {
  const arr = readJSON<Flight[]>(KEY_HISTORY, []);
  return Array.isArray(arr) ? arr : [];
}

export function appendFlight(f: Flight): void {
  const next = [f, ...loadHistory()].slice(0, HISTORY_LIMIT);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(next));
}

export function loadActive(): ActiveFlight | null {
  return readJSON<ActiveFlight | null>(KEY_ACTIVE, null);
}

export function saveActive(a: ActiveFlight | null): void {
  if (a === null) localStorage.removeItem(KEY_ACTIVE);
  else localStorage.setItem(KEY_ACTIVE, JSON.stringify(a));
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- storage.test
```

Expected: PASS 4 tests

- [ ] **Step 5: history & active 테스트 추가**

```ts
describe('storage:history', () => {
  beforeEach(() => localStorage.clear());

  it('appends flight at front, returns empty when none', () => {
    expect(loadHistory()).toEqual([]);
    const f = { id: '1', category: 'work', plannedSeconds: 1500, actualSeconds: 1500, seat: '1A', startedAt: 0, completedAt: 10, status: 'completed' as const };
    appendFlight(f);
    expect(loadHistory()).toEqual([f]);
  });

  it('evicts oldest after HISTORY_LIMIT (1000)', () => {
    for (let i = 0; i < 1002; i++) {
      appendFlight({ id: String(i), category: 'work', plannedSeconds: 60, actualSeconds: 60, seat: '1A', startedAt: i, completedAt: i, status: 'completed' });
    }
    const h = loadHistory();
    expect(h.length).toBe(1000);
    expect(h[0].id).toBe('1001'); // newest first
    expect(h[999].id).toBe('2');
  });
});

describe('storage:active', () => {
  beforeEach(() => localStorage.clear());

  it('saves and clears active flight', () => {
    expect(loadActive()).toBeNull();
    const a: ActiveFlight = { step: 'inflight', flight: { id: 'x', seat: '5C' } };
    saveActive(a);
    expect(loadActive()).toEqual(a);
    saveActive(null);
    expect(loadActive()).toBeNull();
  });
});
```

```bash
npm test -- storage.test
```

Expected: 모든 테스트 PASS

- [ ] **Step 6: test-reviewer 호출 후 Commit**

`test-reviewer`를 호출해 CRITICAL 없으면 commit:

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: localStorage abstraction with seed-merge and history eviction"
```

### Task 1.4: timer.ts — Date.now() 기반 카운트 (TDD)

**Files:**
- Create: `src/lib/timer.ts`, `src/lib/timer.test.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// src/lib/timer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { elapsedSeconds, remainingSeconds, isExpired } from './timer';

describe('timer', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-18T10:00:00Z')));
  afterEach(() => vi.useRealTimers());

  it('elapsed returns 0 at start', () => {
    expect(elapsedSeconds(Date.now())).toBe(0);
  });

  it('elapsed reflects wall clock passage', () => {
    const start = Date.now();
    vi.advanceTimersByTime(45_000);
    expect(elapsedSeconds(start)).toBe(45);
  });

  it('remaining is planned - elapsed, never negative', () => {
    const start = Date.now();
    vi.advanceTimersByTime(30_000);
    expect(remainingSeconds(start, 60)).toBe(30);
    vi.advanceTimersByTime(60_000);
    expect(remainingSeconds(start, 60)).toBe(0);
  });

  it('isExpired true when elapsed >= planned', () => {
    const start = Date.now();
    expect(isExpired(start, 60)).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(isExpired(start, 60)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- timer.test
```

- [ ] **Step 3: 구현**

```ts
// src/lib/timer.ts
export function elapsedSeconds(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function remainingSeconds(startedAt: number, plannedSeconds: number): number {
  return Math.max(0, plannedSeconds - elapsedSeconds(startedAt));
}

export function isExpired(startedAt: number, plannedSeconds: number): boolean {
  return elapsedSeconds(startedAt) >= plannedSeconds;
}

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 4: formatMMSS 테스트 추가**

```ts
describe('formatMMSS', () => {
  it('formats common durations', () => {
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(59)).toBe('00:59');
    expect(formatMMSS(60)).toBe('01:00');
    expect(formatMMSS(1500)).toBe('25:00');
    expect(formatMMSS(3725)).toBe('62:05');
  });
});
```

- [ ] **Step 5: 통과 확인 + test-reviewer + commit**

```bash
npm test -- timer.test
git add src/lib/timer.ts src/lib/timer.test.ts
git commit -m "feat: wall-clock-based timer utilities"
```

### Task 1.5: stats.ts — KPI/주간/도넛 derivation (TDD)

**Files:**
- Create: `src/lib/stats.ts`, `src/lib/stats.test.ts`

- [ ] **Step 1: 실패 테스트 — KPI**

```ts
// src/lib/stats.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { weeklyFocusSeconds, streakDays, averageFlightSeconds, weeklyByDay, categoryBreakdown } from './stats';
import type { Flight } from '../types';

const f = (over: Partial<Flight>): Flight => ({
  id: 'x', category: 'work', plannedSeconds: 1500, actualSeconds: 1500,
  seat: '1A', startedAt: 0, completedAt: 0, status: 'completed', ...over,
});

describe('stats:weeklyFocusSeconds', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-18T10:00:00')));  // 월요일
  afterEach(() => vi.useRealTimers());

  it('sums actualSeconds for completed flights this week (local Mon-Sun)', () => {
    const monday = new Date('2026-05-18T09:00:00').getTime();
    const sunday = new Date('2026-05-24T09:00:00').getTime();
    const lastWeek = new Date('2026-05-11T09:00:00').getTime();
    const history = [
      f({ completedAt: monday, actualSeconds: 1500 }),
      f({ completedAt: sunday, actualSeconds: 600 }),
      f({ completedAt: lastWeek, actualSeconds: 9999 }),
    ];
    expect(weeklyFocusSeconds(history)).toBe(2100);
  });

  it('ignores aborted flights', () => {
    const t = new Date('2026-05-18T11:00:00').getTime();
    expect(weeklyFocusSeconds([f({ completedAt: t, actualSeconds: 600, status: 'aborted' })])).toBe(0);
  });
});

describe('stats:streakDays', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-18T15:00:00')));
  afterEach(() => vi.useRealTimers());

  const day = (d: string) => new Date(d).getTime();

  it('is 0 when no flights', () => {
    expect(streakDays([])).toBe(0);
  });

  it('counts today if today has a completed flight', () => {
    expect(streakDays([f({ completedAt: day('2026-05-18T10:00:00') })])).toBe(1);
  });

  it('counts back from yesterday if no flight today', () => {
    const h = [
      f({ id: 'a', completedAt: day('2026-05-17T10:00:00') }),
      f({ id: 'b', completedAt: day('2026-05-16T10:00:00') }),
    ];
    expect(streakDays(h)).toBe(2);
  });

  it('breaks on gap', () => {
    const h = [
      f({ id: 'a', completedAt: day('2026-05-17T10:00:00') }),
      f({ id: 'b', completedAt: day('2026-05-15T10:00:00') }), // 5/16 빠짐
    ];
    expect(streakDays(h)).toBe(1);
  });

  it('ignores aborted', () => {
    expect(streakDays([f({ status: 'aborted', completedAt: day('2026-05-18T10:00:00') })])).toBe(0);
  });
});

describe('stats:averageFlightSeconds', () => {
  it('averages only completed', () => {
    expect(averageFlightSeconds([
      f({ id: 'a', actualSeconds: 1500 }),
      f({ id: 'b', actualSeconds: 900 }),
      f({ id: 'c', actualSeconds: 9999, status: 'aborted' }),
    ])).toBe(1200);
  });

  it('returns 0 when no completed flights', () => {
    expect(averageFlightSeconds([])).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- stats.test
```

- [ ] **Step 3: 구현**

```ts
// src/lib/stats.ts
import type { Flight } from '../types';

function startOfLocalDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeekMonday(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;  // 일=0→7
  d.setDate(d.getDate() - (day - 1));
  return d.getTime();
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export function weeklyFocusSeconds(history: Flight[]): number {
  const weekStart = startOfWeekMonday(Date.now());
  const weekEnd = weekStart + WEEK_MS;
  return history
    .filter(f => f.status === 'completed' && f.completedAt != null && f.completedAt >= weekStart && f.completedAt < weekEnd)
    .reduce((s, f) => s + f.actualSeconds, 0);
}

export function streakDays(history: Flight[]): number {
  const days = new Set<number>();
  for (const f of history) {
    if (f.status !== 'completed' || f.completedAt == null) continue;
    days.add(startOfLocalDay(f.completedAt));
  }
  if (days.size === 0) return 0;

  const today = startOfLocalDay(Date.now());
  let cursor = days.has(today) ? today : today - DAY_MS;
  if (!days.has(cursor)) return 0;

  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor -= DAY_MS;
  }
  return count;
}

export function averageFlightSeconds(history: Flight[]): number {
  const completed = history.filter(f => f.status === 'completed');
  if (completed.length === 0) return 0;
  return Math.round(completed.reduce((s, f) => s + f.actualSeconds, 0) / completed.length);
}

export type WeeklyByDay = { dayLabel: string; categories: Record<string, number> };

export function weeklyByDay(history: Flight[]): WeeklyByDay[] {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const weekStart = startOfWeekMonday(Date.now());
  const out: WeeklyByDay[] = labels.map(l => ({ dayLabel: l, categories: {} }));
  for (const f of history) {
    if (f.status !== 'completed' || f.completedAt == null) continue;
    const diffDays = Math.floor((startOfLocalDay(f.completedAt) - weekStart) / DAY_MS);
    if (diffDays < 0 || diffDays > 6) continue;
    const bucket = out[diffDays].categories;
    bucket[f.category] = (bucket[f.category] || 0) + f.actualSeconds;
  }
  return out;
}

export function categoryBreakdown(history: Flight[], sinceMs: number = 0): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of history) {
    if (f.status !== 'completed' || f.completedAt == null) continue;
    if (f.completedAt < sinceMs) continue;
    out[f.category] = (out[f.category] || 0) + f.actualSeconds;
  }
  return out;
}
```

- [ ] **Step 4: weeklyByDay & categoryBreakdown 테스트 추가**

```ts
describe('stats:weeklyByDay', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-20T10:00:00')));  // 수요일
  afterEach(() => vi.useRealTimers());

  it('buckets minutes per (day, category)', () => {
    const wed = new Date('2026-05-20T09:00:00').getTime();
    const result = weeklyByDay([
      f({ completedAt: wed, category: 'work', actualSeconds: 1500 }),
      f({ completedAt: wed, category: 'study', actualSeconds: 600 }),
    ]);
    expect(result[2].categories).toEqual({ work: 1500, study: 600 });
    expect(result[0].dayLabel).toBe('월');
  });
});

describe('stats:categoryBreakdown', () => {
  it('sums actualSeconds per category', () => {
    expect(categoryBreakdown([
      f({ category: 'work', actualSeconds: 1500 }),
      f({ category: 'work', actualSeconds: 600 }),
      f({ category: 'study', actualSeconds: 300 }),
    ])).toEqual({ work: 2100, study: 300 });
  });
});
```

- [ ] **Step 5: 통과 확인 + test-reviewer + commit**

```bash
npm test -- stats.test
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "feat: stats derivation (weekly/streak/avg/byDay/category)"
```

### Task 1.6: flightStore — Zustand state machine

**Files:**
- Create: `src/store/flightStore.ts`, `src/store/flightStore.test.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// src/store/flightStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useFlightStore } from './flightStore';

describe('flightStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useFlightStore.setState({ active: null, lastCompleted: null });
  });

  it('starts with no active flight and no lastCompleted', () => {
    expect(useFlightStore.getState().active).toBeNull();
    expect(useFlightStore.getState().lastCompleted).toBeNull();
  });

  it('startBooking creates active in booking step', () => {
    useFlightStore.getState().startBooking();
    expect(useFlightStore.getState().active?.step).toBe('booking');
  });

  it('chooses duration/category then advances to seat', () => {
    const s = useFlightStore.getState();
    s.startBooking();
    s.setDuration(25);
    s.setCategory('work');
    s.advance();
    expect(useFlightStore.getState().active?.step).toBe('seat');
    expect(useFlightStore.getState().active?.flight.plannedSeconds).toBe(1500);
    expect(useFlightStore.getState().active?.flight.category).toBe('work');
  });

  it('abort clears active without appending history', () => {
    const s = useFlightStore.getState();
    s.startBooking();
    s.abort();
    expect(useFlightStore.getState().active).toBeNull();
  });

  it('startFlight sets startedAt and moves to inflight', () => {
    const s = useFlightStore.getState();
    s.startBooking(); s.setDuration(25); s.setCategory('work'); s.advance();
    s.setSeat('12A'); s.advance(); // boarding
    s.advance(); // checkin
    s.startFlight();
    expect(useFlightStore.getState().active?.step).toBe('inflight');
    expect(useFlightStore.getState().active?.flight.startedAt).toBeTruthy();
  });

  it('land completes flight, appends to history, clears active, sets lastCompleted', () => {
    const s = useFlightStore.getState();
    s.startBooking(); s.setDuration(25); s.setCategory('work');
    s.advance(); s.setSeat('12A'); s.advance(); s.advance(); s.startFlight();
    s.land();
    expect(useFlightStore.getState().active).toBeNull();
    expect(useFlightStore.getState().lastCompleted?.category).toBe('work');
    expect(useFlightStore.getState().lastCompleted?.seat).toBe('12A');
  });

  it('dismissLanded clears the post-flight screen', () => {
    useFlightStore.setState({ lastCompleted: { id: 'x', category: 'work', plannedSeconds: 60, actualSeconds: 60, seat: '1A', startedAt: 0, completedAt: 60, status: 'completed' } });
    useFlightStore.getState().dismissLanded();
    expect(useFlightStore.getState().lastCompleted).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- flightStore.test
```

- [ ] **Step 3: 구현**

```ts
// src/store/flightStore.ts
import { create } from 'zustand';
import type { ActiveFlight, Flight, FlightStep } from '../types';
import { appendFlight, loadActive, saveActive } from '../lib/storage';
import { nanoid } from 'nanoid';
import { elapsedSeconds } from '../lib/timer';

const ORDER: FlightStep[] = ['booking', 'seat', 'boarding', 'checkin', 'inflight', 'landed'];

type State = {
  active: ActiveFlight | null;
  lastCompleted: Flight | null;   // 직전 완료된 비행 (Landed 화면 표시용, UI dismissal 시 null)
  startBooking: () => void;
  setDuration: (minutes: number) => void;
  setCategory: (id: string) => void;
  setSeat: (seat: string) => void;
  advance: () => void;
  startFlight: () => void;
  land: () => void;
  abort: () => void;
  hydrate: () => void;
  dismissLanded: () => void;
};

function persist(active: ActiveFlight | null) {
  saveActive(active);
}

export const useFlightStore = create<State>((set, get) => ({
  active: null,
  lastCompleted: null,

  hydrate: () => {
    const a = loadActive();
    set({ active: a });
  },

  dismissLanded: () => set({ lastCompleted: null }),

  startBooking: () => {
    const a: ActiveFlight = { step: 'booking', flight: { id: nanoid(8) } };
    set({ active: a }); persist(a);
  },

  setDuration: (minutes) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, flight: { ...s.active.flight, plannedSeconds: minutes * 60 } };
    persist(a); return { active: a };
  }),

  setCategory: (id) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, flight: { ...s.active.flight, category: id } };
    persist(a); return { active: a };
  }),

  setSeat: (seat) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, flight: { ...s.active.flight, seat } };
    persist(a); return { active: a };
  }),

  advance: () => set(s => {
    if (!s.active) return s;
    const idx = ORDER.indexOf(s.active.step);
    const next = ORDER[Math.min(idx + 1, ORDER.length - 1)];
    const a = { ...s.active, step: next };
    persist(a); return { active: a };
  }),

  startFlight: () => set(s => {
    if (!s.active) return s;
    const a: ActiveFlight = {
      step: 'inflight',
      flight: { ...s.active.flight, startedAt: Date.now() },
    };
    persist(a); return { active: a };
  }),

  land: () => {
    const a = get().active;
    if (!a || !a.flight.startedAt || !a.flight.plannedSeconds || !a.flight.category || !a.flight.seat) {
      set({ active: null }); persist(null); return;
    }
    const completedAt = Date.now();
    const actualSeconds = Math.min(elapsedSeconds(a.flight.startedAt), a.flight.plannedSeconds);
    const flight: Flight = {
      id: a.flight.id || nanoid(8),
      category: a.flight.category,
      plannedSeconds: a.flight.plannedSeconds,
      actualSeconds,
      seat: a.flight.seat,
      startedAt: a.flight.startedAt,
      completedAt,
      status: 'completed',
    };
    appendFlight(flight);
    set({ active: null, lastCompleted: flight }); persist(null);
  },

  abort: () => { set({ active: null }); persist(null); },
}));
```

- [ ] **Step 4: 통과 확인 + test-reviewer + commit**

```bash
npm test -- flightStore.test
git add src/store/flightStore.ts src/store/flightStore.test.ts
git commit -m "feat: flight state machine store (booking → landed)"
```

### Task 1.7: settingsStore + Router skeleton + 빈 라우트

**Files:**
- Create: `src/store/settingsStore.ts`, `src/App.tsx` (overwrite), `src/routes/{Home,Stats,Settings}.tsx`

- [ ] **Step 1: settingsStore (테스트는 storage 테스트로 커버됨)**

```ts
// src/store/settingsStore.ts
import { create } from 'zustand';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../lib/storage';
import type { Settings, Category } from '../types';

type State = {
  settings: Settings;
  setVolume: (v: number) => void;
  setSoundEnabled: (b: boolean) => void;
  setNotificationsEnabled: (b: boolean) => void;
  setDefaultDuration: (m: number) => void;
  addCategory: (c: Category) => void;
  removeCategory: (id: string) => void;
};

function commit(next: Settings) {
  saveSettings(next);
  return next;
}

export const useSettingsStore = create<State>((set, get) => ({
  settings: loadSettings() ?? DEFAULT_SETTINGS,
  setVolume: (v) => set({ settings: commit({ ...get().settings, volume: Math.max(0, Math.min(1, v)) }) }),
  setSoundEnabled: (b) => set({ settings: commit({ ...get().settings, soundEnabled: b }) }),
  setNotificationsEnabled: (b) => set({ settings: commit({ ...get().settings, notificationsEnabled: b }) }),
  setDefaultDuration: (m) => set({ settings: commit({ ...get().settings, defaultDurationMinutes: m }) }),
  addCategory: (c) => set({ settings: commit({ ...get().settings, categories: [...get().settings.categories, c] }) }),
  removeCategory: (id) => set({ settings: commit({ ...get().settings, categories: get().settings.categories.filter(c => c.id !== id) }) }),
}));
```

- [ ] **Step 2: 빈 라우트 생성**

```tsx
// src/routes/Home.tsx
export default function Home() {
  return <div className="p-8 text-2xl">Home (TBD)</div>;
}
// src/routes/Stats.tsx
export default function Stats() {
  return <div className="p-8 text-2xl">Stats (TBD)</div>;
}
// src/routes/Settings.tsx
export default function Settings() {
  return <div className="p-8 text-2xl">Settings (TBD)</div>;
}
```

- [ ] **Step 3: App.tsx 작성**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './routes/Home';
import Stats from './routes/Stats';
import Settings from './routes/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 bg-slate-900 text-white flex gap-4">
        <Link to="/">Home</Link>
        <Link to="/stats">Stats</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: 동작 확인**

```bash
npm run dev
```

3개 라우트 이동 가능한지 확인.

- [ ] **Step 5: 빌드 + 커밋**

```bash
npm run build
git add -A
git commit -m "feat: router skeleton + settings store + empty route stubs"
```

### Task 1.8: M1 종료 체크

- [ ] **Step 1: 모든 테스트 통과**

```bash
npm test -- --run
```

Expected: 모든 단위 테스트 PASS

- [ ] **Step 2: 빌드 통과**

```bash
npm run build
```

- [ ] **Step 3: 마일스톤 커밋 (없으면 skip)**

```bash
git log --oneline | head -20
```

7~8 커밋이 보이면 M1 완료.

---

## Chunk 2: M2 — Core Flight Flow

**목표**: booking → seat → boarding → checkin → inflight → landed 6단계가 실제로 동작. 스타일은 최소. localStorage에 active 영속화는 M1에서 storage로 이미 구현됨.

### Task 2.1: FlightMachine 컨테이너

**Files:**
- Create: `src/flight/FlightMachine.tsx`
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: FlightMachine 구현**

```tsx
// src/flight/FlightMachine.tsx
import { useEffect } from 'react';
import { useFlightStore } from '../store/flightStore';
import Booking from './steps/Booking';
import SeatSelection from './steps/SeatSelection';
import BoardingPass from './steps/BoardingPass';
import CheckIn from './steps/CheckIn';
import InFlight from './steps/InFlight';
import Landed from './steps/Landed';

export default function FlightMachine() {
  const { active, hydrate, startBooking } = useFlightStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!active) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">FocusFlight</h1>
        <button onClick={startBooking} className="bg-orange-500 text-white px-6 py-3 rounded-lg">
          Book a flight
        </button>
      </div>
    );
  }

  switch (active.step) {
    case 'booking': return <Booking />;
    case 'seat': return <SeatSelection />;
    case 'boarding': return <BoardingPass />;
    case 'checkin': return <CheckIn />;
    case 'inflight': return <InFlight />;
    case 'landed': return <Landed />;
  }
}
```

- [ ] **Step 2: Home 라우트가 FlightMachine 호스트**

```tsx
// src/routes/Home.tsx
import FlightMachine from '../flight/FlightMachine';
export default function Home() {
  return <FlightMachine />;
}
```

- [ ] **Step 3: 빈 step 컴포넌트 생성 (각 파일)**

각 파일은 placeholder. 자세한 구현은 다음 task에서.

```tsx
// src/flight/steps/Booking.tsx
export default function Booking() { return <div className="p-8">Booking step</div>; }
// 동일 패턴으로 SeatSelection, BoardingPass, CheckIn, InFlight, Landed 생성
```

- [ ] **Step 4: 동작 확인**

```bash
npm run dev
```

"Book a flight" 버튼 클릭 → Booking step 표시 확인.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: FlightMachine container with step placeholders"
```

### Task 2.2: Booking step — 시간/카테고리 선택

**Files:**
- Modify: `src/flight/steps/Booking.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/flight/steps/Booking.tsx
import { useState } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';

const DURATIONS = [15, 25, 45, 60, 90];

export default function Booking() {
  const { active, setDuration, setCategory, advance, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  const [custom, setCustom] = useState('');

  const selectedDuration = active?.flight.plannedSeconds ? active.flight.plannedSeconds / 60 : null;
  const selectedCategory = active?.flight.category;

  const canProceed = !!selectedDuration && !!selectedCategory;

  return (
    <div className="max-w-xl mx-auto p-8 space-y-8">
      <h2 className="text-2xl font-bold">Book your flight</h2>

      <section>
        <h3 className="text-sm uppercase tracking-wider mb-3">Duration</h3>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map(d => (
            <button key={d}
              onClick={() => setDuration(d)}
              className={`px-4 py-2 rounded-lg border ${selectedDuration === d ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-300'}`}>
              {d} min
            </button>
          ))}
          <input type="number" min={1} max={300} placeholder="custom"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onBlur={() => { const n = parseInt(custom); if (n > 0) setDuration(n); }}
            className="px-3 py-2 border border-slate-300 rounded-lg w-24" />
        </div>
      </section>

      <section>
        <h3 className="text-sm uppercase tracking-wider mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {settings.categories.map(c => (
            <button key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-lg border ${selectedCategory === c.id ? 'text-white border-transparent' : 'border-slate-300'}`}
              style={selectedCategory === c.id ? { backgroundColor: c.color } : {}}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex gap-3 justify-end">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
        <button onClick={advance} disabled={!canProceed}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg disabled:opacity-40">
          Next: Choose seat →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 통합 테스트**

```tsx
// tests/booking-step.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../src/App';
import { useFlightStore } from '../src/store/flightStore';

describe('Booking step', () => {
  beforeEach(() => {
    localStorage.clear();
    useFlightStore.setState({ active: null });
  });

  it('advances to seat after duration + category chosen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Book a flight'));
    await user.click(screen.getByText('25 min'));
    await user.click(screen.getByText('일'));
    await user.click(screen.getByText(/Next: Choose seat/));
    expect(useFlightStore.getState().active?.step).toBe('seat');
  });
});
```

- [ ] **Step 3: 통과 + 커밋**

```bash
npm test -- booking-step
git add -A
git commit -m "feat: Booking step (duration + category)"
```

### Task 2.3: SeatSelection — 3-6 그리드

**Files:**
- Create: `src/components/SeatMap.tsx`
- Modify: `src/flight/steps/SeatSelection.tsx`

- [ ] **Step 1: SeatMap 컴포넌트**

```tsx
// src/components/SeatMap.tsx
const ROWS = 10;
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

type Props = {
  selected: string | null;
  recentlyUsed: Set<string>;
  onSelect: (seat: string) => void;
};

export default function SeatMap({ selected, recentlyUsed, onSelect }: Props) {
  return (
    <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
      {Array.from({ length: ROWS }, (_, r) => COLS.map(c => {
        const label = (r + 1) + c;
        const isSel = label === selected;
        const isUsed = recentlyUsed.has(label);
        return (
          <button key={label} onClick={() => onSelect(label)}
            className={`aspect-square rounded text-xs font-mono ${
              isSel ? 'bg-orange-500 text-white ring-2 ring-orange-300' :
              isUsed ? 'bg-slate-200 text-slate-400' :
              'bg-slate-100 hover:bg-slate-200'
            }`}>
            {label}
          </button>
        );
      })).flat()}
    </div>
  );
}
```

- [ ] **Step 2: SeatSelection step**

```tsx
// src/flight/steps/SeatSelection.tsx
import { useMemo } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { loadHistory } from '../../lib/storage';
import SeatMap from '../../components/SeatMap';

export default function SeatSelection() {
  const { active, setSeat, advance, abort } = useFlightStore();
  const recentlyUsed = useMemo(() => new Set(loadHistory().slice(0, 20).map(f => f.seat)), []);

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold">Choose your seat</h2>
      <SeatMap
        selected={active?.flight.seat ?? null}
        recentlyUsed={recentlyUsed}
        onSelect={setSeat}
      />
      <div className="flex gap-3 justify-end">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
        <button onClick={advance} disabled={!active?.flight.seat}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg disabled:opacity-40">
          Next: Boarding pass →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 동작 확인 + 커밋**

```bash
npm run dev   # 좌석 선택 후 다음 가능한지 확인
git add -A
git commit -m "feat: SeatMap component + SeatSelection step"
```

### Task 2.4: BoardingPass step

**Files:**
- Create: `src/components/BoardingPassCard.tsx`
- Modify: `src/flight/steps/BoardingPass.tsx`

- [ ] **Step 1: BoardingPassCard 공통 컴포넌트**

```tsx
// src/components/BoardingPassCard.tsx
import type { Category } from '../types';

type Props = {
  category: Category;
  durationMinutes: number;
  seat: string;
};

export default function BoardingPassCard({ category, durationMinutes, seat }: Props) {
  return (
    <div className="grid grid-cols-[1fr_auto] bg-amber-50 text-slate-900 rounded-xl overflow-hidden shadow-xl max-w-md mx-auto font-mono">
      <div className="p-6 border-r-2 border-dashed border-amber-200">
        <div className="flex justify-between mb-4 text-xs">
          <span className="font-bold tracking-widest">FOCUSFLIGHT</span>
          <span className="text-slate-500">FOCUS CLASS</span>
        </div>
        <div className="flex items-center justify-between mb-5">
          <div className="text-center"><div className="text-2xl font-extrabold">NOW</div><div className="text-[10px] text-slate-500">현재</div></div>
          <div className="text-orange-500 text-xl -rotate-12">✈</div>
          <div className="text-center"><div className="text-2xl font-extrabold">DONE</div><div className="text-[10px] text-slate-500">완료</div></div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><div className="text-slate-500 text-[9px] tracking-widest">CATEGORY</div><div className="font-bold" style={{ color: category.color }}>{category.label}</div></div>
          <div><div className="text-slate-500 text-[9px] tracking-widest">DURATION</div><div className="font-bold">{durationMinutes} MIN</div></div>
          <div><div className="text-slate-500 text-[9px] tracking-widest">GATE</div><div className="font-bold">F1</div></div>
        </div>
      </div>
      <div className="bg-orange-400 p-6 flex flex-col items-center justify-between min-w-[120px]">
        <div className="text-[9px] tracking-widest">SEAT</div>
        <div className="text-4xl font-extrabold">{seat}</div>
        <div className="text-[9px] tracking-widest opacity-70">TICKET</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: BoardingPass step**

```tsx
// src/flight/steps/BoardingPass.tsx
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import BoardingPassCard from '../../components/BoardingPassCard';

export default function BoardingPass() {
  const { active, advance, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  if (!active) return null;
  const cat = settings.categories.find(c => c.id === active.flight.category);
  if (!cat || !active.flight.seat || !active.flight.plannedSeconds) return null;

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold text-center">Your boarding pass</h2>
      <BoardingPassCard
        category={cat}
        durationMinutes={active.flight.plannedSeconds / 60}
        seat={active.flight.seat}
      />
      <div className="flex gap-3 justify-center">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
        <button onClick={advance} className="bg-orange-500 text-white px-6 py-2 rounded-lg">
          Proceed to check-in →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 동작 확인 + 커밋**

```bash
git add -A
git commit -m "feat: BoardingPassCard component + BoardingPass step"
```

### Task 2.5: CheckIn — stub drag-to-tear

**Files:**
- Modify: `src/flight/steps/CheckIn.tsx`

- [ ] **Step 1: Framer Motion drag 구현**

```tsx
// src/flight/steps/CheckIn.tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import BoardingPassCard from '../../components/BoardingPassCard';
import { useState } from 'react';

const TEAR_THRESHOLD = 180;

export default function CheckIn() {
  const { active, startFlight, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, TEAR_THRESHOLD], [1, 0.2]);
  const [torn, setTorn] = useState(false);

  if (!active) return null;
  const cat = settings.categories.find(c => c.id === active.flight.category);
  if (!cat || !active.flight.seat || !active.flight.plannedSeconds) return null;

  function handleDragEnd() {
    if (x.get() >= TEAR_THRESHOLD && !torn) {
      setTorn(true);
      setTimeout(() => startFlight(), 350);
    } else {
      x.set(0);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold text-center">Tear stub to board</h2>
      <div className="relative">
        <BoardingPassCard category={cat} durationMinutes={active.flight.plannedSeconds / 60} seat={active.flight.seat} />
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: TEAR_THRESHOLD + 20 }}
          dragElastic={0.1}
          style={{ x, opacity }}
          onDragEnd={handleDragEnd}
          className="absolute top-0 right-0 bottom-0 w-[120px] bg-orange-400 rounded-r-xl cursor-grab active:cursor-grabbing">
          <div className="flex flex-col h-full items-center justify-center text-white font-mono text-[10px] tracking-widest">
            ≫ TEAR ≫
          </div>
        </motion.div>
      </div>
      <div className="flex gap-3 justify-center">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 키보드 fallback 추가**

`Space` 길게누르기:

```tsx
import { useEffect } from 'react';

useEffect(() => {
  let timer: number | null = null;
  function onDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !timer) {
      timer = window.setTimeout(() => { setTorn(true); setTimeout(() => startFlight(), 350); }, 500);
    }
  }
  function onUp(e: KeyboardEvent) { if (e.code === 'Space' && timer) { clearTimeout(timer); timer = null; } }
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); if (timer) clearTimeout(timer); };
}, []);
```

- [ ] **Step 3: 수동 확인 + 커밋**

```bash
git add -A
git commit -m "feat: CheckIn step with drag-to-tear + space fallback"
```

### Task 2.6: InFlight — 카운트다운 + 만료

**Files:**
- Create: `src/components/Countdown.tsx`
- Modify: `src/flight/steps/InFlight.tsx`

- [ ] **Step 1: Countdown 컴포넌트 (Date.now 기반)**

```tsx
// src/components/Countdown.tsx
import { useEffect, useState } from 'react';
import { remainingSeconds, formatMMSS } from '../lib/timer';

type Props = { startedAt: number; plannedSeconds: number; onExpire: () => void };

export default function Countdown({ startedAt, plannedSeconds, onExpire }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    const onVis = () => setTick(t => t + 1);
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const rem = remainingSeconds(startedAt, plannedSeconds);
  useEffect(() => { if (rem === 0) onExpire(); }, [rem, onExpire]);

  return (
    <div className="text-8xl font-mono font-bold text-amber-50 tracking-widest">
      {formatMMSS(rem)}
    </div>
  );
}
```

- [ ] **Step 2: InFlight step**

```tsx
// src/flight/steps/InFlight.tsx
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import Countdown from '../../components/Countdown';

export default function InFlight() {
  const { active, land, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  if (!active || !active.flight.startedAt || !active.flight.plannedSeconds) return null;
  const cat = settings.categories.find(c => c.id === active.flight.category);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-orange-400 flex flex-col items-center justify-center gap-6">
      <Countdown startedAt={active.flight.startedAt} plannedSeconds={active.flight.plannedSeconds} onExpire={land} />
      <div className="text-amber-50 text-sm tracking-widest font-mono opacity-70">
        {cat?.label} · {active.flight.seat} · {(active.flight.plannedSeconds / 60)} MIN
      </div>
      <button onClick={() => { if (confirm('Abort flight?')) abort(); }} className="absolute top-4 right-4 text-amber-50/40 text-xs">
        Abort
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 동작 확인 + 커밋**

`Booking → Seat → Boarding → CheckIn(tear) → InFlight` 까지 흐르는지 확인. 짧은 시간(1분)으로 테스트 후 만료가 land() 호출하는지 확인.

```bash
git add -A
git commit -m "feat: Countdown component + InFlight step with auto-expire"
```

### Task 2.7: Landed step

**Files:**
- Modify: `src/flight/FlightMachine.tsx`, `src/flight/steps/Landed.tsx`

**접근**: `land()`는 Task 1.6에서 이미 `lastCompleted`를 세팅하도록 구현됨. `FlightMachine`은 `active === null && lastCompleted` 상태일 때 Landed 화면을 보여준다. 사용자가 dismiss 또는 startBooking 시 lastCompleted를 비움.

- [ ] **Step 1: FlightMachine 분기 추가**

```tsx
// FlightMachine.tsx의 if (!active) { ... } 직전에:
const { active, lastCompleted, hydrate, startBooking } = useFlightStore();

if (!active && lastCompleted) {
  return <Landed flight={lastCompleted} />;
}
```

기존 idle 분기(`!active`)는 그대로 유지 (lastCompleted가 null일 때).

- [ ] **Step 2: Landed UI**

```tsx
// src/flight/steps/Landed.tsx
import { useFlightStore } from '../../store/flightStore';
import type { Flight } from '../../types';
import { formatMMSS } from '../../lib/timer';

export default function Landed({ flight }: { flight: Flight }) {
  const { startBooking, dismissLanded } = useFlightStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-amber-50">
      <div className="text-6xl">🛬</div>
      <h2 className="text-3xl font-bold">Landed</h2>
      <div className="font-mono text-center space-y-1 text-sm">
        <div>{formatMMSS(flight.actualSeconds)} focused</div>
        <div className="opacity-60">Seat {flight.seat}</div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { dismissLanded(); startBooking(); }} className="bg-orange-500 px-6 py-3 rounded-lg">Book another</button>
        <button onClick={dismissLanded} className="px-6 py-3 border border-amber-50/30 rounded-lg">
          Home
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: Landed screen with last-completed display"
```

### Task 2.8: M2 통합 테스트 (full flow)

**Files:**
- Create: `tests/flight-full-flow.test.tsx`

- [ ] **Step 1: 테스트 작성**

```tsx
// tests/flight-full-flow.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { useFlightStore } from '../src/store/flightStore';
import { loadHistory } from '../src/lib/storage';

describe('Flight full flow (1-min flight)', () => {
  beforeEach(() => {
    localStorage.clear();
    useFlightStore.setState({ active: null, lastCompleted: null });
    vi.useFakeTimers();
  });

  it('booking → landed appends to history', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await user.click(screen.getByText('Book a flight'));
    await user.click(screen.getByText('25 min'));
    await user.click(screen.getByText('일'));
    await user.click(screen.getByText(/Next: Choose seat/));

    await user.click(screen.getByText('1A'));
    await user.click(screen.getByText(/Next: Boarding pass/));

    await user.click(screen.getByText(/Proceed to check-in/));

    // bypass drag — directly call startFlight
    useFlightStore.getState().startFlight();

    // expire
    vi.advanceTimersByTime(25 * 60 * 1000 + 1000);
    // Countdown's onExpire effect triggers land()
    await vi.runOnlyPendingTimersAsync();

    expect(loadHistory().length).toBe(1);
    expect(loadHistory()[0].category).toBe('work');
    expect(loadHistory()[0].seat).toBe('1A');
  });
});
```

- [ ] **Step 2: 실행 + 통과 + test-reviewer + 커밋**

```bash
npm test -- flight-full-flow
git add -A
git commit -m "test: full flight flow integration (booking → landed)"
```

### Task 2.9: M2 마일스톤 종료

- [ ] **Step 1: 전체 테스트 통과**

```bash
npm test -- --run
```

- [ ] **Step 2: 빌드 통과 + 수동 확인**

```bash
npm run build
npm run dev   # 실제 25분 흐름 한 번 끝까지 (또는 짧은 시간으로 단축)
```

---

## Chunk 3: M3 — Persistence & Resume

**목표**: 새로고침/탭 닫기 후 재진입 시 진행 중 비행 복구. ResumeModal로 사용자에게 Resume/Abort 선택 제공. 백그라운드 만료 자동 처리.

### Task 3.1: ResumeModal 컴포넌트

**Files:**
- Create: `src/flight/ResumeModal.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/flight/ResumeModal.tsx
type Props = { onResume: () => void; onAbort: () => void };

export default function ResumeModal({ onResume, onAbort }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full space-y-4">
        <h3 className="text-xl font-bold">Resume your flight?</h3>
        <p className="text-slate-600 text-sm">A flight was in progress when you left. Continue or discard?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onAbort} className="px-4 py-2 text-slate-500">Discard</button>
          <button onClick={onResume} className="bg-orange-500 text-white px-6 py-2 rounded-lg">Resume</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: FlightMachine에서 hydrate 시 모달 표시 로직**

```tsx
// FlightMachine.tsx에 추가
const [showResume, setShowResume] = useState(false);
useEffect(() => {
  hydrate();
  const a = loadActive();
  if (a) setShowResume(true);
}, [hydrate]);

if (showResume) {
  return <ResumeModal
    onResume={() => setShowResume(false)}
    onAbort={() => { abort(); setShowResume(false); }}
  />;
}
```

- [ ] **Step 3: 통합 테스트**

```tsx
// tests/resume-flow.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { saveActive } from '../src/lib/storage';

describe('Resume flow', () => {
  beforeEach(() => localStorage.clear());

  it('shows resume modal when active exists on mount', async () => {
    saveActive({ step: 'inflight', flight: { id: 'x', startedAt: Date.now(), plannedSeconds: 1500, category: 'work', seat: '1A' } });
    render(<App />);
    expect(await screen.findByText(/Resume your flight/)).toBeInTheDocument();
  });

  it('Discard clears active and shows home', async () => {
    saveActive({ step: 'inflight', flight: { id: 'x' } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Discard'));
    expect(screen.getByText('Book a flight')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 커밋**

```bash
npm test -- resume-flow
git add -A
git commit -m "feat: ResumeModal for active flight recovery"
```

### Task 3.2: Resume 시 만료 즉시 처리 + beforeunload 경고

**Files:**
- Modify: `src/flight/FlightMachine.tsx`, `src/flight/steps/InFlight.tsx`

- [ ] **Step 1: Resume 직후 isExpired면 즉시 land() 호출**

```tsx
// FlightMachine.tsx
import { isExpired } from '../lib/timer';

function onResume() {
  setShowResume(false);
  const a = useFlightStore.getState().active;
  if (a?.step === 'inflight' && a.flight.startedAt && a.flight.plannedSeconds
      && isExpired(a.flight.startedAt, a.flight.plannedSeconds)) {
    useFlightStore.getState().land();
  }
}
// ResumeModal의 onResume prop으로 전달
```

- [ ] **Step 2: beforeunload 경고 (In-flight 중)**

```tsx
// InFlight.tsx에 useEffect 추가
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, []);
```

- [ ] **Step 3: 통합 테스트 — 만료된 상태로 마운트 시 즉시 land**

```tsx
// tests/resume-flow.test.tsx에 추가
it('lands immediately when resume on already-expired flight', async () => {
  const past = Date.now() - 30 * 60 * 1000;  // 30분 전
  saveActive({ step: 'inflight', flight: { id: 'x', startedAt: past, plannedSeconds: 60, category: 'work', seat: '1A' } });
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByText(/Resume/));
  // lastCompleted 화면 표시 또는 history에 적재 확인
  expect(loadHistory().length).toBe(1);
});
```

- [ ] **Step 4: 커밋**

```bash
npm test -- resume-flow
git add -A
git commit -m "feat: detect expired flight on resume + beforeunload guard"
```

### Task 3.3: WakeLock — In-flight 중 화면 sleep 방지

**Files:**
- Create: `src/lib/wakelock.ts`
- Modify: `src/flight/steps/InFlight.tsx`

- [ ] **Step 1: WakeLock wrapper**

```ts
// src/lib/wakelock.ts
let sentinel: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
  } catch {
    // 권한 거부 or 미지원 — silent
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (sentinel) {
    try { await sentinel.release(); } catch {}
    sentinel = null;
  }
}
```

- [ ] **Step 2: InFlight에서 마운트/언마운트 시 호출**

```tsx
import { requestWakeLock, releaseWakeLock } from '../../lib/wakelock';

useEffect(() => {
  requestWakeLock();
  const onVis = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    releaseWakeLock();
    document.removeEventListener('visibilitychange', onVis);
  };
}, []);
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: wake lock during in-flight"
```

---

## Chunk 4: M4 — Stats Dashboard

**목표**: `/stats` 라우트에 KPI 카드 3개 + 주간 막대 + 카테고리 도넛 + 최근 비행 테이블.

### Task 4.1: KpiCard 컴포넌트

**Files:**
- Create: `src/components/KpiCard.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/components/KpiCard.tsx
export default function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A && git commit -m "feat: KpiCard component"
```

### Task 4.2: WeeklyBar 차트 (Recharts)

**Files:**
- Create: `src/components/charts/WeeklyBar.tsx`

- [ ] **Step 1: 구현 작성**

```tsx
// src/components/charts/WeeklyBar.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeeklyByDay } from '../../lib/stats';
import type { Category } from '../../types';

type Props = { data: WeeklyByDay[]; categories: Category[] };

export default function WeeklyBar({ data, categories }: Props) {
  const flat = data.map(d => ({
    name: d.dayLabel,
    ...Object.fromEntries(Object.entries(d.categories).map(([k, v]) => [k, Math.round(v / 60)])),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={flat}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit="m" />
        <Tooltip />
        {categories.map(c => (
          <Bar key={c.id} dataKey={c.id} stackId="a" fill={c.color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: 빌드 확인 (recharts 트리쉐이킹)**

```bash
npm run build
```

dist 크기가 너무 크면 (>500KB chunk) Recharts를 dynamic import로 분리 검토.

### Task 4.3: CategoryDonut

**Files:**
- Create: `src/components/charts/CategoryDonut.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/components/charts/CategoryDonut.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Category } from '../../types';

type Props = { breakdown: Record<string, number>; categories: Category[] };

export default function CategoryDonut({ breakdown, categories }: Props) {
  const data = categories
    .map(c => ({ name: c.label, value: Math.round((breakdown[c.id] || 0) / 60), color: c.color }))
    .filter(d => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={50} outerRadius={90}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Commit charts**

```bash
git add -A && git commit -m "feat: WeeklyBar + CategoryDonut charts"
```

### Task 4.4: Stats 페이지 통합 (기간 토글 포함)

**Files:**
- Modify: `src/routes/Stats.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/routes/Stats.tsx
import { useMemo, useState } from 'react';
import { loadHistory } from '../lib/storage';
import { weeklyFocusSeconds, streakDays, averageFlightSeconds, weeklyByDay, categoryBreakdown } from '../lib/stats';
import { useSettingsStore } from '../store/settingsStore';
import { formatMMSS } from '../lib/timer';
import KpiCard from '../components/KpiCard';
import WeeklyBar from '../components/charts/WeeklyBar';
import CategoryDonut from '../components/charts/CategoryDonut';

type Period = 'week' | 'month' | 'all';

function sinceFor(p: Period): number {
  if (p === 'all') return 0;
  const now = Date.now();
  return p === 'week' ? now - 7 * 86400000 : now - 30 * 86400000;
}

export default function Stats() {
  const { settings } = useSettingsStore();
  const [period, setPeriod] = useState<Period>('week');
  const history = useMemo(() => loadHistory(), []);
  const weekSec = useMemo(() => weeklyFocusSeconds(history), [history]);
  const streak = useMemo(() => streakDays(history), [history]);
  const avgSec = useMemo(() => averageFlightSeconds(history), [history]);
  const weekly = useMemo(() => weeklyByDay(history), [history]);
  const breakdown = useMemo(() => categoryBreakdown(history, sinceFor(period)), [history, period]);

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>아직 비행 기록이 없습니다 — 첫 비행을 예약해보세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stats</h1>
        <div className="flex gap-1 text-xs">
          {(['week', 'month', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded ${period === p ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>
              {p === 'week' ? '주' : p === 'month' ? '월' : '전체'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="This week" value={`${Math.round(weekSec / 60)}m`} />
        <KpiCard label="Streak" value={`${streak} days`} />
        <KpiCard label="Average flight" value={formatMMSS(avgSec)} hint="최근 1000개 비행 기준" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h3 className="text-sm font-bold mb-2">Last 7 days</h3>
          <WeeklyBar data={weekly} categories={settings.categories} />
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h3 className="text-sm font-bold mb-2">Categories ({period})</h3>
          <CategoryDonut breakdown={breakdown} categories={settings.categories} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest">
            <tr><th className="p-3 text-left">Date</th><th>Category</th><th>Duration</th><th>Seat</th><th>Status</th></tr>
          </thead>
          <tbody>
            {history.slice(0, 20).map(f => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="p-3">{new Date(f.startedAt).toLocaleString()}</td>
                <td>{settings.categories.find(c => c.id === f.category)?.label ?? f.category}</td>
                <td>{formatMMSS(f.actualSeconds)} / {formatMMSS(f.plannedSeconds)}</td>
                <td className="font-mono">{f.seat}</td>
                <td className={f.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}>{f.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Empty + data 테스트**

```tsx
// tests/stats-empty.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Stats from '../src/routes/Stats';

describe('Stats empty', () => {
  beforeEach(() => localStorage.clear());
  it('shows empty state', () => {
    render(<MemoryRouter><Stats /></MemoryRouter>);
    expect(screen.getByText(/아직 비행 기록이 없습니다/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 커밋**

```bash
npm test -- stats
git add -A
git commit -m "feat: Stats dashboard with KPIs, charts, recent table"
```

---

## Chunk 5: M5 — Polish (Visual + Animations)

**목표**: 컬러/타이포 시스템 적용, 단계 전환 Framer Motion 슬라이드, 보딩패스 등장 spring, 구름 SVG, prefers-reduced-motion 대응.

### Task 5.1: 컬러 토큰 + Tailwind 확장

**Files:**
- Modify: `tailwind.config.js`, `src/styles/globals.css`

- [ ] **Step 1: tailwind.config.js theme extend**

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0A1628',
        deepblue: '#264653',
        sunset: '#F4A261',
        paper: '#F5F1E8',
        complete: '#2A9D8F',
      },
      fontFamily: {
        ticket: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
};
```

- [ ] **Step 2: globals.css에 Inter/JetBrains Mono 로드 + reduced-motion**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500;700;800&display=swap');
@tailwind base; @tailwind components; @tailwind utilities;
body { font-family: 'Inter', sans-serif; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

기존 컴포넌트의 컬러 클래스(`bg-orange-500` → `bg-sunset` 등)도 새 토큰으로 교체.

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "style: color tokens + fonts + reduced-motion guard"
```

### Task 5.2: 단계 전환 애니메이션

**Files:**
- Modify: `src/flight/FlightMachine.tsx`

- [ ] **Step 1: AnimatePresence 래핑**

```tsx
import { AnimatePresence, motion } from 'framer-motion';

// switch 부분을 다음으로 교체
return (
  <AnimatePresence mode="wait">
    <motion.div key={active.step}
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ duration: 0.2 }}>
      {/* switch case 그대로 */}
    </motion.div>
  </AnimatePresence>
);
```

- [ ] **Step 2: 보딩패스 spring 등장**

`src/flight/steps/BoardingPass.tsx`의 `BoardingPassCard` 래핑:

```tsx
<motion.div initial={{ y: -100, opacity: 0, rotate: -3 }}
  animate={{ y: 0, opacity: 1, rotate: 0 }}
  transition={{ type: 'spring', stiffness: 100, damping: 12 }}>
  <BoardingPassCard ... />
</motion.div>
```

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "feat: step transitions + boarding pass spring entry"
```

### Task 5.3: In-flight 구름 애니메이션 + 창문 프레임

**Files:**
- Modify: `src/flight/steps/InFlight.tsx`
- Create: `public/clouds/cloud-{1,2,3}.svg` (간단한 SVG)

- [ ] **Step 1: SVG 자산 생성 (또는 inline)**

inline으로 처리 (외부 파일 불필요):

```tsx
function Cloud({ delay, top, scale }: { delay: number; top: string; scale: number }) {
  return (
    <motion.div className="absolute w-32 h-8 bg-paper/70 rounded-full blur-sm"
      style={{ top, scale }}
      initial={{ x: '-30vw' }}
      animate={{ x: '130vw' }}
      transition={{ duration: 30, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}
```

- [ ] **Step 2: InFlight에 3개 cloud 레이어 + 창문 프레임**

```tsx
<div className="min-h-screen bg-gradient-to-b from-night via-deepblue to-sunset relative overflow-hidden flex items-center justify-center">
  <Cloud delay={0} top="30%" scale={1} />
  <Cloud delay={8} top="50%" scale={0.7} />
  <Cloud delay={15} top="70%" scale={0.9} />
  <div className="relative z-10 ...">
    <Countdown ... />
  </div>
</div>
```

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "feat: in-flight cloud parallax"
```

### Task 5.4: a11y aria-label + reduced-motion 검증

**Files:**
- Modify: `src/flight/steps/CheckIn.tsx`

- [ ] **Step 1: stub에 aria-label 추가**

```tsx
<motion.div
  role="button"
  tabIndex={0}
  aria-label="Tear boarding pass to start your flight"
  ...
>
```

- [ ] **Step 2: 수동 검증**

macOS 시스템 설정 → 손쉬운 사용 → 모션 줄이기 활성화 후 reload. 단계 전환이 즉시 일어나고 구름이 정지하는지 확인 (globals.css의 reduced-motion 미디어 쿼리가 동작).

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "a11y: stub aria-label + verify reduced-motion guard"
```

---

## Chunk 6: M6 — Sound System

**목표**: `lib/audio.ts` 작성 + 4종 사운드 프리로드 + 의식 전환별 큐 발생 + in-flight mute 토글.

### Task 6.1: `lib/audio.ts` — AudioContext + GainNode

**Files:**
- Create: `src/lib/audio.ts`, `src/lib/audio.test.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// src/lib/audio.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioBus } from './audio';

describe('AudioBus', () => {
  beforeEach(() => {
    // jsdom AudioContext mock
    (globalThis as any).AudioContext = class {
      createGain() { return { gain: { value: 1, linearRampToValueAtTime: vi.fn() }, connect: vi.fn() }; }
      destination = {};
      currentTime = 0;
      resume = vi.fn().mockResolvedValue(undefined);
      state = 'running';
    };
  });

  it('initializes with master gain', () => {
    const bus = new AudioBus();
    expect(bus.getVolume()).toBe(0.6);
  });

  it('setVolume clamps to [0,1]', () => {
    const bus = new AudioBus();
    bus.setVolume(1.5); expect(bus.getVolume()).toBe(1);
    bus.setVolume(-0.2); expect(bus.getVolume()).toBe(0);
  });
});
```

- [ ] **Step 2: 구현**

```ts
// src/lib/audio.ts
export type SoundId = 'takeoff' | 'engine' | 'landing' | 'tear';

const URLS: Record<SoundId, string> = {
  takeoff: '/sounds/takeoff.mp3',
  engine: '/sounds/engine.mp3',
  landing: '/sounds/landing.mp3',
  tear: '/sounds/tear.mp3',
};

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private elements: Map<SoundId, HTMLAudioElement> = new Map();
  private volume = 0.6;

  init(): void {
    if (this.ctx) return;
    const Ctx = (window.AudioContext ?? (window as any).webkitAudioContext);
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    for (const id of Object.keys(URLS) as SoundId[]) {
      const el = new Audio(URLS[id]);
      el.preload = 'auto';
      el.loop = id === 'engine';
      const source = this.ctx.createMediaElementSource(el);
      source.connect(this.master);
      this.elements.set(id, el);
    }
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  getVolume(): number { return this.volume; }

  private fade(toValue: number, durationMs = 200): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(toValue, now + durationMs / 1000);
  }

  play(id: SoundId): void {
    const el = this.elements.get(id);
    if (!el) return;
    el.currentTime = 0;
    this.fade(this.volume, 200);   // ensure master at target after a previous fadeout
    el.play().catch(() => {});
  }

  /** Stop with a short fade-out (useful for engine loop). */
  stop(id: SoundId): void {
    const el = this.elements.get(id);
    if (!el) return;
    if (id === 'engine') {
      this.fade(0, 200);
      window.setTimeout(() => {
        el.pause();
        el.currentTime = 0;
        this.fade(this.volume, 200);   // restore master so next play() audible
      }, 220);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }
}

export const audioBus = new AudioBus();
```

- [ ] **Step 3: 통과 + 커밋**

```bash
npm test -- audio.test
git add -A
git commit -m "feat: AudioBus with master gain and 4 preloaded cues"
```

### Task 6.2: 사운드 파일 추가

**Files:**
- Add: `public/sounds/{takeoff,engine,landing,tear}.mp3`
- Create: `public/sounds/CREDITS.md`

- [ ] **Step 1: CC0/CC-BY 소스에서 4개 파일 다운로드**

추천 검색어 (freesound.org):
- takeoff: "airplane takeoff" CC0
- engine: "airplane cabin ambient" CC0 (loopable 권장)
- landing: "airplane landing chime" CC0
- tear: "paper rip short" CC0

`public/sounds/`에 배치. 파일명 정확히 `takeoff.mp3`, `engine.mp3`, `landing.mp3`, `tear.mp3`.

- [ ] **Step 2: CREDITS.md 작성**

```md
# Sound Credits

- takeoff.mp3 — [Title](URL) by Author, CC0
- engine.mp3 — [Title](URL) by Author, CC0
- landing.mp3 — [Title](URL) by Author, CC0
- tear.mp3 — [Title](URL) by Author, CC0
```

- [ ] **Step 3: 커밋**

```bash
git add public/sounds/
git commit -m "chore: add CC0 sound assets"
```

### Task 6.3: 전환별 사운드 큐 연결

**Files:**
- Modify: `src/flight/steps/CheckIn.tsx`, `src/flight/steps/InFlight.tsx`, `src/flight/FlightMachine.tsx`

- [ ] **Step 1: CheckIn의 tear 트리거 시 사운드**

```tsx
import { audioBus } from '../../lib/audio';
// drag end + 임계 도달 시:
await audioBus.resume();
audioBus.play('tear');
```

- [ ] **Step 2: startFlight 직후 takeoff + engine**

```tsx
// CheckIn 또는 InFlight 마운트 직후
setTimeout(() => {
  audioBus.play('takeoff');
  setTimeout(() => audioBus.play('engine'), 1500);
}, 200);
```

- [ ] **Step 3: land 시 engine stop + landing**

```tsx
// onExpire 콜백에 추가
audioBus.stop('engine');
audioBus.play('landing');
```

- [ ] **Step 4: settings.soundEnabled 반영**

`audioBus.setVolume(settings.soundEnabled ? settings.volume : 0)` 형태로 settings 변경 구독.

```tsx
// src/main.tsx 또는 App.tsx
useEffect(() => {
  audioBus.init();
  return useSettingsStore.subscribe((s) => {
    audioBus.setVolume(s.settings.soundEnabled ? s.settings.volume : 0);
  });
}, []);
```

- [ ] **Step 5: in-flight mute 토글**

```tsx
// InFlight 우상단
<button onClick={() => useSettingsStore.getState().setSoundEnabled(!settings.soundEnabled)}>
  {settings.soundEnabled ? '🔊' : '🔇'}
</button>
```

- [ ] **Step 6: 통합 테스트 (mocked audio)**

```tsx
// tests/sound-cues.test.tsx
import { vi } from 'vitest';
vi.mock('../src/lib/audio', () => ({
  audioBus: { init: vi.fn(), resume: vi.fn(), play: vi.fn(), stop: vi.fn(), setVolume: vi.fn() },
}));

// ... 전체 플로우 시뮬 + audioBus.play 호출 인자 검증 (tear, takeoff, engine, landing 순서)
```

- [ ] **Step 7: 커밋**

```bash
npm test -- sound-cues
git add -A
git commit -m "feat: wire sound cues to flight transitions"
```

---

## Chunk 7: M7 — Settings & Notifications

**목표**: Settings 페이지 UI(카테고리 CRUD, 볼륨, 알림 토글), Notification API wrapper, 권한 거부 fallback.

### Task 7.1: Notification API wrapper

**Files:**
- Create: `src/lib/notifications.ts`

- [ ] **Step 1: 구현**

```ts
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return await Notification.requestPermission();
}

export function notify(title: string, body?: string): void {
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body });
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A && git commit -m "feat: notifications wrapper"
```

### Task 7.2: Settings 페이지 UI

**Files:**
- Modify: `src/routes/Settings.tsx`

- [ ] **Step 1: 구현**

```tsx
import { useSettingsStore } from '../store/settingsStore';
import { requestPermission } from '../lib/notifications';
import { useState } from 'react';

export default function Settings() {
  const { settings, setVolume, setSoundEnabled, setNotificationsEnabled, addCategory, removeCategory } = useSettingsStore();
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#888');

  async function toggleNotif(b: boolean) {
    if (b) {
      const p = await requestPermission();
      if (p !== 'granted') {
        alert('알림 권한이 거부되어 토글을 다시 끕니다.');
        setNotificationsEnabled(false);
        return;
      }
    }
    setNotificationsEnabled(b);
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section>
        <h2 className="font-bold mb-3">Categories</h2>
        <div className="space-y-2">
          {settings.categories.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-white rounded border border-slate-200">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: c.color }} />
              <span className="flex-1">{c.label}</span>
              <button onClick={() => removeCategory(c.id)} className="text-red-500 text-sm">Remove</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="라벨" className="px-3 py-2 border rounded flex-1" />
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-12 h-10 border rounded" />
          <button onClick={() => { if (newLabel) { addCategory({ id: newLabel.toLowerCase(), label: newLabel, color: newColor }); setNewLabel(''); } }}
            className="bg-sunset text-white px-4 rounded">Add</button>
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Sound</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={settings.soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} />
          Enable sounds
        </label>
        <div className="mt-3">
          <label className="text-sm">Volume: {Math.round(settings.volume * 100)}%</label>
          <input type="range" min={0} max={1} step={0.05} value={settings.volume}
            onChange={e => setVolume(parseFloat(e.target.value))} className="w-full" />
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Notifications</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={settings.notificationsEnabled} onChange={e => toggleNotif(e.target.checked)} />
          알림으로 비행 종료 시점 받기
        </label>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A && git commit -m "feat: Settings page (categories, sound, notifications)"
```

### Task 7.3: 비행 종료 알림 발사

**Files:**
- Modify: `src/flight/steps/InFlight.tsx`

- [ ] **Step 1: onExpire 콜백 안에 알림 발사**

```tsx
// onExpire 콜백 안에
import { notify } from '../../lib/notifications';
import { useSettingsStore } from '../../store/settingsStore';

// ...
if (useSettingsStore.getState().settings.notificationsEnabled) {
  notify('Flight landed', 'Your focus session is complete.');
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A && git commit -m "feat: fire notification on flight expiry"
```

---

## Chunk 8: M8 — Deployment

**목표**: README 작성, Vercel/Cloudflare Pages 빌드 검증, 수동 테스트 후 라이브 배포.

### Task 8.1: README

**Files:**
- Create: `README.md`

```md
# FocusFlight Web

A personal-use focus timer wrapped in a flight-booking ritual.

## Dev

```bash
npm install
npm run dev   # http://localhost:5173
npm test      # vitest
npm run build # static to dist/
```

## Deploy

### Vercel
- Framework preset: Vite
- Build command: `npm run build`
- Output: `dist`
- No env vars

### Cloudflare Pages
- Same as above

## Spec & Plan
- Spec: `docs/specs/2026-05-18-focusflight-web-design.md`
- Plan: `docs/plans/2026-05-18-focusflight-web-implementation.md`
```

- [ ] **커밋**

```bash
git add -A && git commit -m "docs: README"
```

### Task 8.2: 수동 검증 체크리스트

각 항목 직접 확인 후 체크:

- [ ] booking → seat → boarding → checkin → inflight → landed 전체 플로우 1회 (실제 25분 또는 단축)
- [ ] 새로고침 후 ResumeModal 표시 및 Resume/Discard 동작
- [ ] 백그라운드 탭으로 두고 비행 만료 시 알림 + Landed 화면 (visibilitychange 복귀 시)
- [ ] Stats 페이지: 1회 비행 후 KPI/차트/테이블 표시
- [ ] Settings: 카테고리 추가/제거, 볼륨 슬라이더, 알림 토글
- [ ] 사운드: tear → takeoff → engine → landing 순서 매끄러움
- [ ] 모바일 (iOS Safari, Android Chrome): drag-to-tear 터치 동작, 사운드 재생, 풀스크린
- [ ] prefers-reduced-motion: macOS 시스템 설정에서 활성화 후 애니메이션 최소화 확인

### Task 8.3: Vercel 배포

- [ ] GitHub repo 생성 (private OK), push
- [ ] Vercel 콘솔에서 import → Vite preset 자동 감지 → Deploy
- [ ] 배포된 URL에서 위 체크리스트 다시 1회 검증
- [ ] (옵션) 커스텀 도메인 연결

---

## 완료 후

- 모든 마일스톤 task checkbox 채워짐
- 모든 단위/통합 테스트 PASS
- 라이브 URL 동작
- `lastCompleted` 화면에서 "Book another" 누르면 다시 의식 시작

## 후속 (v1.1+ 아이디어)

- WebSocket 동기화로 여러 디바이스 사용
- 좌석 사용 빈도에 따른 시각 효과 차등
- Wake Lock API (모바일 In-flight 스크린 sleep 방지)
- 사용자 작성 사운드 업로드
- 카테고리별 평균 길이 차트
- 시간대별 집중 패턴 히트맵
