# FocusFlight Web — Design Spec

- **Date**: 2026-05-18
- **Author**: 정상진 (with Claude)
- **Status**: Draft → Review
- **Goal**: 브라우저에서 동작하는 개인용 집중 타이머. 원본 FocusFlight(iOS/Android)의 "비행 의식 UX"를 핵심 차별점으로 살리되, 결제/멀티유저/OS 레벨 차단 같은 웹/개인용 비적합 기능은 제외한다.

## 1. Why

원본 FocusFlight 앱은 구독제($3.99/월 또는 $23.99/년)이며 단순한 타이머에 "비행 의식"이라는 의식적 진입(ritual) UX를 입혀 차별화한 제품이다. 사용자는 본인이 직접 쓰기 위해 웹 버전을 만들기를 원한다 — 결제 회피 + 본인 워크플로우에 맞춰 커스터마이즈 가능성.

## 2. Scope

### In scope
- 비행 의식 5단계: Booking → Seat → Boarding Pass → Check-in/Tear → In-flight → Landed
- 집중 타이머 (15/25/45/60/90/커스텀 분)
- 카테고리 태그 (user-defined, 기본 3개 시드)
- 통계 대시보드 (주/월/전체, KPI 카드 + 막대 + 도넛 차트)
- 진행 중 비행 새로고침/재진입 복구
- 종료 알림 (Notification API, 옵션)
- **사운드 시스템**: 이륙음, 비행 중 엔진 앰비언트 루프, 착륙음, stub tear SFX (on/off + 볼륨 조절)
- localStorage 기반 영속화
- Vercel / Cloudflare Pages 정적 배포

### Out of scope
- 사용자 인증/계정
- 결제/구독
- 멀티 디바이스 동기화 (서버 없음)
- OS 레벨 앱/사이트 차단 (브라우저 한계)
- 모바일 네이티브 앱
- 다국어 (한국어 + 영어 키만)
- 협업/소셜 기능

## 3. Stack

| 영역 | 선택 | 이유 |
|---|---|---|
| 빌드 | Vite | 가장 빠른 React 정적 SPA 빌드 |
| 프레임워크 | React 18 + TypeScript | 익숙한 스택, 타입 안전성 |
| 스타일 | Tailwind CSS | 빠른 prototyping, 커스텀 애니메이션 클래스 작성 용이 |
| 애니메이션 | Framer Motion | 단계 전환, 보딩패스 등장, stub drag-to-tear |
| 상태관리 | Zustand | Redux 오버킬, Context는 새로고침 복구 미러링에 부담 |
| 라우팅 | React Router v6 | `/`, `/stats`, `/settings` 3개 라우트 |
| 차트 | Recharts | React-native, 가벼움 |
| 영속화 | localStorage | 서버 없음, 개인 사용 |
| 테스트 | Vitest + React Testing Library | Vite 친화 |
| 배포 | Vercel 또는 Cloudflare Pages | 정적 빌드 무료 호스팅 |

## 4. UX 플로우

### 4.1 라우팅 구조

```
/              → 비행 의식 호스트 (state machine)
/stats         → 통계 대시보드
/settings      → 카테고리 관리, 기본값
```

### 4.2 비행 의식 단계 (state machine)

```
idle → booking → seat → boarding → checkin → inflight → landed → idle
                                                       ↘ aborted → idle
```

1. **idle** — 홈 카드 ("Book a flight" CTA, 최근 비행 요약)
2. **booking** — 시간 선택(15/25/45/60/90/커스텀) + 카테고리 선택
3. **seat** — 좌석 맵에서 1자리 선택 (장식적이지만 의식의 핵심)
4. **boarding** — 발권된 보딩패스 카드 등장 (카테고리, 시간, 게이트, 좌석)
5. **checkin** — 보딩패스 stub drag-to-tear 인터랙션 (또는 길게누르기 fallback)
6. **inflight** — 풀스크린 카운트다운, 창 프레임 + 흘러가는 구름
7. **landed** — 세션 완료, 통계 업데이트, "다시 예약" / "홈으로"
8. **aborted** — 의식 도중 취소 (확인 모달 후), 부분 기록도 남기지 않음

### 4.3 단계 전환

- 단계 간 전환: 좌→우 슬라이드 (Framer Motion `AnimatePresence`)
- 보딩패스 등장: spring으로 종이 튀어나오는 모션
- Stub tear: drag 거리 80% 넘으면 찢어짐 + (옵션) 종이 SFX
- In-flight 진입: 비행기 이륙 사운드(옵션) + 풀스크린 fade

## 5. 데이터 모델

```ts
// src/types.ts

export type Flight = {
  id: string;                    // nanoid
  category: string;              // categories[].id 참조
  plannedSeconds: number;
  actualSeconds: number;         // 중단되면 부분 기록
  seat: string;                  // '12A'
  startedAt: number;             // epoch ms
  completedAt: number | null;
  status: 'completed' | 'aborted';
};

export type Category = {
  id: string;
  label: string;
  color: string;                 // hex
};

export type Settings = {
  categories: Category[];
  defaultDurationMinutes: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  volume: number;              // 0.0 ~ 1.0, default 0.6
};

export type ActiveFlight = {
  step: 'booking' | 'seat' | 'boarding' | 'checkin' | 'inflight' | 'landed';
  flight: Partial<Flight>;
};
```

> **Note**: `idle` 상태는 별도 enum 값이 아니라 `focusflight:active === null`로 표현된다. `aborted`는 의식 취소 시 active를 폐기하고 history에도 남기지 않으므로 ActiveFlight에 등장하지 않는다 (취소 = "기록 없음").

### localStorage 키

| Key | Type | 설명 |
|---|---|---|
| `focusflight:history` | `Flight[]` | 완료/중단된 비행 전체 (최대 1000개, FIFO eviction) |
| `focusflight:settings` | `Settings` | 카테고리, 기본값, 알림 설정 |
| `focusflight:active` | `ActiveFlight \| null` | 진행 중 비행 (새로고침 복구용) |
| `focusflight:schemaVersion` | `number` | 스키마 마이그레이션용 (현재 v1) |

### 스키마 마이그레이션 정책

- 부팅 시 `schemaVersion`을 읽음. 없으면 1로 시드 (현재 버전).
- **누락 필드는 시드 기본값으로 자동 보강**: 로더는 저장된 Settings 객체에서 누락된 키(예: 새로 추가된 `volume`)를 `DEFAULT_SETTINGS`와 얕은 병합으로 채움. 작은 필드 추가는 별도 마이그레이션 함수 없이 처리 가능.
- 미래 버전 업그레이드 (구조적 변경, 예: 필드 의미 변경/제거): `migrations[from][to]` 형태의 단계적 변환 함수로 처리하고 schemaVersion 증가.
- **현재 버전보다 높은 값**(다른 디바이스에서 신버전으로 저장된 데이터를 구버전 앱에서 열 때): 안전을 위해 `history`만 보존하고 `settings`/`active`는 시드값으로 초기화 후 콘솔 경고.
- **JSON 파싱 실패**: 해당 키만 시드값으로 복구, 다른 키 유지.

### 기본 시드 (최초 실행 시)

```ts
const DEFAULT_SETTINGS: Settings = {
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
```

## 6. Stats 대시보드

### 상단 KPI (3 카드)
- **이번 주 총 집중 시간**: 로컬 타임존 월~일 기준
- **연속 일수 (streak)**: 로컬 자정 기준, 비행 1회 이상 완료한 날의 연속 길이.
  - 오늘 비행 없으면: 어제까지 연속이 있으면 표시(끊김 아님, "어제까지 N일"), 그 이전에 끊겼으면 0.
  - 오늘 비행 있으면: 오늘 포함 연속.
- **평균 비행 시간**: 보존된 history(최대 1000개) 내 completed 비행의 actualSeconds 평균. "전체" 기간 통계는 보존 한도 기준임을 footnote로 명시.

### 차트
- **주간 막대 차트**: 최근 7일, 일별 집중 분, 카테고리별 색상 스택
- **카테고리 도넛**: 선택 기간(주/월/전체) 카테고리 비중

### 최근 비행 테이블
- 최근 20개, 컬럼: 날짜시각 / 카테고리 / 계획-실제 시간 / 좌석 / 상태

### 기간 토글
- 주 / 월 / 전체

### Empty state
- 데이터 없을 때: "아직 비행 기록이 없습니다 — 첫 비행을 예약해보세요" + CTA

## 7. 엣지 케이스 정책

| 상황 | 동작 |
|---|---|
| In-flight 중 탭 닫기 | `beforeunload` 경고. 닫혀도 `active` 상태 localStorage 유지 |
| 새로고침 후 재진입 | `active` 있으면 ResumeModal: Resume(같은 step 복귀) / Abort(폐기) |
| 백그라운드 탭 | 타이머 표시는 `Date.now()` 기반이라 정확. 애니메이션만 멈춤(브라우저 기본) |
| 비행 시간 만료 (탭 백그라운드 중) | 백그라운드에서 `setTimeout`은 throttle되므로 만료 시점 미보장. 따라서 (a) 포커스 복귀(`visibilitychange`) 시 `Date.now()`로 재계산해 만료 시 즉시 Landed 전환, (b) 만료 시점 알림은 권한 있을 때 `setTimeout` + Notification API로 best-effort 전송(지연 가능성 사용자 안내) |
| Notification 권한 거부 | settings의 `notificationsEnabled` 토글을 자동 OFF로 되돌리고 토스트로 안내 |
| WakeLock 지원 안 됨 | `navigator.wakeLock` 미지원 브라우저면 silent fallback (인플라이트만 적용, 미지원 시 그냥 잠금 동작) |
| 의식 도중 취소 | "Cancel booking?" 확인 → active 폐기, 기록 X |
| 시스템 슬립/시계 변경 | 시작 시각만 저장 → 깨어났을 때 경과 재계산. 음수면 만료 처리 |
| 데이터 손상 (JSON 파싱 실패) | 해당 키만 초기화, 다른 키 유지. 콘솔 경고 |

## 8. 시각 디자인

### 컨셉
모던 항공사 + 따뜻한 보딩패스 종이 질감 하이브리드.

### 컬러 팔레트
- **베이스 (밤하늘)**: `#0A1628`
- **액센트 (노을 오렌지)**: `#F4A261`
- **종이 (보딩패스 본체)**: `#F5F1E8`
- **보조 (블루)**: `#264653`
- **성공/완료**: `#2A9D8F`

### 타이포
- UI: Inter (var)
- 티켓 번호/좌석/시간 코드: JetBrains Mono

### 모션
- 단계 전환: 좌→우 슬라이드 + 페이드 (200ms)
- 보딩패스 등장: spring (mass 0.8, stiffness 100)
- Stub tear: drag 80% 임계, scale 변형 + opacity fade out
- In-flight 구름: 30초 주기 좌→우 평행이동 (SVG, 3개 레이어 다른 속도)

## 9. 사운드 시스템

비행 의식의 몰입감을 위해 사운드는 v1 필수 기능. 의식의 핵심 — 종이 찢는 소리, 엔진의 진동, 착륙 알림이 시각적 의식과 동등하게 중요.

### 사운드 큐 (4종)

| ID | 시점 | 종류 | 길이 |
|---|---|---|---|
| `takeoff` | In-flight 진입 시 1회 | one-shot | ~6s, fade-out |
| `engine` | In-flight 전체 동안 | loop (seamless) | ~20s loop |
| `landing` | 비행 시간 만료 시 1회 | one-shot | ~4s |
| `tear` | Stub tear 임계 도달 시 | one-shot | ~0.4s |

추가 후보 (v1.1+): 좌석 선택 클릭, 보딩패스 발권 효과음, 알림음.

### 구현 메커니즘

- **HTMLAudioElement** + Web Audio API `AudioContext` + `GainNode`로 마스터 볼륨 제어
- 모든 사운드는 앱 시작 시 `<audio preload="auto">` 또는 `fetch + decodeAudioData`로 프리로드
- **자동재생 정책 회피**: 사운드는 모두 사용자 제스처(check-in stub drag 완료 = takeoff/engine 시작) 이후에만 재생되므로 브라우저 autoplay 정책 통과
- **Fade in/out**: `GainNode.gain.linearRampToValueAtTime`로 진입/종료 시 200ms 페이드 (뚝 끊기는 느낌 방지)
- **루프 처리**: HTMLAudioElement `loop = true`. 단, 무한루프 시 메모리 누수 방지 위해 In-flight 종료 시 명시적 `pause() + src 분리`
- **마스터 게인**: `settings.volume` 변경 시 `gainNode.gain.value` 즉시 반영. 토글 OFF면 `gain = 0`
- **iOS Safari 대응**: `AudioContext`는 첫 user gesture 핸들러 안에서 `audioContext.resume()`을 명시적으로 호출해야 함. check-in stub drag 완료 시점에서 1회 호출하면 이후 모든 큐 정상 재생.

### 소스 정책

v1은 **CC0 또는 CC-BY 라이선스** 사운드만 사용. 후보 소스:
- [freesound.org](https://freesound.org/) (CC0/CC-BY 필터 검색)
- [Pixabay](https://pixabay.com/sound-effects/) (사용 자유)
- [Zapsplat](https://www.zapsplat.com/) (계정 필요, 무료)

각 파일은 `public/sounds/`에 위치, 라이선스 정보는 `public/sounds/CREDITS.md`에 기록.

### 파일 형식 / 용량 목표

- 형식: **mp3** (모든 모던 브라우저 호환). engine loop의 seamless 처리는 사전에 오디오 편집 단계에서 zero-crossing 정렬해 mp3 자체로 매끄럽게 만들기 (v1.1+에 필요 시 ogg dual-source fallback 도입 검토)
- 비트레이트: 음악 아닌 SFX이므로 128kbps 충분
- 용량 목표: 4개 사운드 합쳐 < 500KB (engine 루프가 가장 큼, ~300KB 예상)

### 사운드 컨트롤 위치

- **Settings 페이지**: on/off 토글 + 볼륨 슬라이더
- **In-flight 화면**: 우상단에 작은 mute 토글 (의식 도중 빠르게 끄고 싶을 때) — 클릭 시 settings.soundEnabled 토글 반영

### 8.1 디자인 샘플 (Visual mockups)

<div class="design-samples">

<h4>컬러 팔레트</h4>
<div class="swatches">
  <div class="swatch" style="--c:#0A1628"><span>밤하늘</span><code>#0A1628</code></div>
  <div class="swatch" style="--c:#264653"><span>딥블루</span><code>#264653</code></div>
  <div class="swatch" style="--c:#F4A261;color:#0A1628"><span>노을</span><code>#F4A261</code></div>
  <div class="swatch" style="--c:#F5F1E8;color:#0A1628"><span>티켓 종이</span><code>#F5F1E8</code></div>
  <div class="swatch" style="--c:#2A9D8F"><span>완료</span><code>#2A9D8F</code></div>
</div>

<h4>보딩 패스 카드 (mockup)</h4>
<div class="boarding-pass">
  <div class="bp-main">
    <div class="bp-header">
      <div class="bp-brand">FOCUSFLIGHT</div>
      <div class="bp-class">FOCUS CLASS</div>
    </div>
    <div class="bp-route">
      <div class="bp-airport">
        <div class="bp-code">NOW</div>
        <div class="bp-label">현재</div>
      </div>
      <div class="bp-plane">✈</div>
      <div class="bp-airport">
        <div class="bp-code">DONE</div>
        <div class="bp-label">완료</div>
      </div>
    </div>
    <div class="bp-meta">
      <div><div class="bp-k">CATEGORY</div><div class="bp-v">일</div></div>
      <div><div class="bp-k">DURATION</div><div class="bp-v">25 MIN</div></div>
      <div><div class="bp-k">GATE</div><div class="bp-v">F1</div></div>
    </div>
  </div>
  <div class="bp-stub">
    <div class="bp-k">SEAT</div>
    <div class="bp-seat">12A</div>
    <div class="bp-tear">≫ TEAR TO BOARD ≫</div>
  </div>
</div>

<h4>좌석 맵 (3-3, 10열)</h4>
<div class="seatmap">
  <div class="seatmap-grid">
    <!-- 10 rows × 6 seats; selected = 12A (row 1, leftmost) example -->
  </div>
  <div class="seatmap-legend">
    <span class="seat-dot available"></span> 가능
    <span class="seat-dot selected"></span> 선택
    <span class="seat-dot taken"></span> 지난 비행
  </div>
</div>

<h4>In-flight 카운트다운</h4>
<div class="countdown-mock">
  <div class="cd-window">
    <div class="cd-cloud cd-cloud-1"></div>
    <div class="cd-cloud cd-cloud-2"></div>
    <div class="cd-time">17:42</div>
    <div class="cd-cat">일 · 25 MIN · 12A</div>
  </div>
</div>

<h4>단계 플로우</h4>
<div class="step-flow">
  <div class="step">Booking</div>
  <div class="arrow">→</div>
  <div class="step">Seat</div>
  <div class="arrow">→</div>
  <div class="step">Boarding Pass</div>
  <div class="arrow">→</div>
  <div class="step">Check-in</div>
  <div class="arrow">→</div>
  <div class="step active">In-flight</div>
  <div class="arrow">→</div>
  <div class="step">Landed</div>
</div>

<h4>사운드 큐 타임라인</h4>
<div class="sound-timeline">
  <div class="sl-row">
    <div class="sl-label">tear</div>
    <div class="sl-track"><span class="sl-clip oneshot" style="left:8%;width:3%">≀</span></div>
  </div>
  <div class="sl-row">
    <div class="sl-label">takeoff</div>
    <div class="sl-track"><span class="sl-clip oneshot" style="left:12%;width:10%">▶ takeoff</span></div>
  </div>
  <div class="sl-row">
    <div class="sl-label">engine</div>
    <div class="sl-track"><span class="sl-clip loop" style="left:18%;width:74%">⟲ engine loop · fade in/out</span></div>
  </div>
  <div class="sl-row">
    <div class="sl-label">landing</div>
    <div class="sl-track"><span class="sl-clip oneshot" style="left:90%;width:8%">▶ landing</span></div>
  </div>
  <div class="sl-axis">
    <span>0:00</span><span>check-in</span><span>in-flight</span><span>landed</span>
  </div>
</div>

</div>

## 10. 폴더 구조

```
sound-project/focusflight-web/
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # Router
│   ├── routes/
│   │   ├── Home.tsx                  # FlightMachine 호스트
│   │   ├── Stats.tsx
│   │   └── Settings.tsx
│   ├── flight/
│   │   ├── FlightMachine.tsx
│   │   ├── steps/
│   │   │   ├── Booking.tsx
│   │   │   ├── SeatSelection.tsx
│   │   │   ├── BoardingPass.tsx
│   │   │   ├── CheckIn.tsx
│   │   │   ├── InFlight.tsx
│   │   │   └── Landed.tsx
│   │   └── ResumeModal.tsx
│   ├── components/
│   │   ├── BoardingPassCard.tsx
│   │   ├── SeatMap.tsx
│   │   ├── Countdown.tsx
│   │   ├── KpiCard.tsx
│   │   └── charts/
│   │       ├── WeeklyBar.tsx
│   │       └── CategoryDonut.tsx
│   ├── store/
│   │   ├── flightStore.ts            # Zustand: ActiveFlight + actions
│   │   └── settingsStore.ts          # Zustand: Settings
│   ├── lib/
│   │   ├── timer.ts                  # Date.now() 기반 카운트
│   │   ├── storage.ts                # localStorage 추상화 + 스키마 마이그레이션
│   │   ├── stats.ts                  # history → derived metrics
│   │   ├── notifications.ts          # Notification API wrapper
│   │   ├── audio.ts                  # AudioContext + GainNode + 사운드 로더/플레이어
│   │   └── id.ts                     # nanoid
│   ├── types.ts
│   └── styles/
│       └── globals.css               # Tailwind + custom keyframes
├── tests/                            # 통합 테스트 (단위는 옆에 *.test.ts)
├── public/
│   ├── clouds/                       # 구름 SVG 레이어
│   └── sounds/
│       ├── takeoff.mp3
│       ├── engine.mp3                # seamless loop
│       ├── landing.mp3
│       ├── tear.mp3
│       └── CREDITS.md                # 라이선스 / 출처
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── docs/
    └── specs/
        └── 2026-05-18-focusflight-web-design.md
```

## 11. 테스트 전략

### 단위 (Vitest, 옆에 `*.test.ts`)
- `lib/timer.test.ts` — 시작/일시정지/경과/시계 변경
- `lib/storage.test.ts` — 직렬화/역직렬화/마이그레이션/손상 복구
- `lib/stats.test.ts` — KPI / 주간 / 도넛 derivation, streak 엣지(오늘 비행 없음 / 자정 경계 / 시간대 변경 / history 1000 초과 평균)
- `lib/audio.test.ts` — 게인/볼륨 변경, 사운드 미지원 환경 fallback (jsdom + AudioContext mock)
- `store/flightStore.test.ts` — state transitions

### 통합 (RTL, `tests/`)
- `flight-full-flow.test.tsx` — booking → landed 1회
- `resume-flow.test.tsx` — active 있는 상태로 마운트 → 모달 → Resume
- `sound-cues.test.tsx` — 상태 전환별 사운드 큐 호출 검증 (mock된 audio API): stub-tear 임계 → tear, in-flight 진입 → takeoff + engine.loop, 만료(visibilitychange 재계산 경로 포함) → engine.stop + landing
- `stats-empty.test.tsx` / `stats-with-data.test.tsx` — empty state vs 시드 데이터

### 수동 검증
- 단계 전환 애니메이션 부드러움
- 보딩패스 stub drag-to-tear 인터랙션 감
- 백그라운드 탭 타이머 정확도 (10분, 30분, 60분)
- Notification 권한 흐름
- 모바일 브라우저 (iOS Safari, Android Chrome) 동작
- 사운드 재생: tear → takeoff → engine loop → landing 순서 매끄러움, 페이드 인/아웃 자연스러움
- 사운드 토글/볼륨 즉시 반영, iOS Safari 자동재생 정책 통과

### 테스트 가드레일
- 테스트 파일 변경 커밋 전 `test-reviewer` 호출 (CLAUDE.md 규칙)
- CRITICAL 항목 있으면 사용자 확인 없이 커밋 금지

## 12. 배포

### Vercel (1순위)
1. GitHub repo 생성 후 Vercel 연결
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output: `dist`
5. 환경변수 없음

### Cloudflare Pages (대안)
- 동일하게 정적 빌드 업로드
- 무료 티어 충분

### 도메인
- 기본 `*.vercel.app` 또는 `*.pages.dev` 무료 도메인 사용
- 커스텀 도메인은 추후 결정

## 13. 마일스톤

| Phase | 산출물 |
|---|---|
| M1 — Skeleton | Vite 셋업, Router, Zustand 스토어, 빈 단계 컴포넌트, localStorage 추상화 |
| M2 — Core flow | booking → seat → boarding → checkin → inflight → landed 전체 동작 (스타일 최소) |
| M3 — Persistence | active 복구, 새로고침 시 ResumeModal, 만료 자동 처리 |
| M4 — Stats | KPI 카드, 주간 막대, 카테고리 도넛, 최근 비행 테이블 |
| M5 — Polish | Framer Motion 단계 전환, 보딩패스 모션, stub tear, 구름 애니메이션, 컬러/타이포 |
| M6 — Sound | `lib/audio.ts`, 4종 사운드 프리로드, in-flight mute 토글, settings 볼륨 슬라이더 |
| M7 — Settings & 알림 | 카테고리 CRUD, Notification API |
| M8 — Deploy | Vercel 배포, 수동 검증, README |

각 마일스톤이 끝날 때 동작하는 상태를 유지 (incremental delivery).

## 14. 결정 사항 (이전 미해결 이슈)

- **사운드/SFX**: v1 **in-scope**. takeoff / engine loop / landing / tear 4종. CC0/CC-BY 라이선스 소스만 사용. 상세는 Section 9 참조.
- **좌석 맵 레이아웃**: 단편기 3-3 배치 (총 10열 = 60석). 의식 핵심이므로 단순 유지 — 창가/통로 구분은 시각적으로만 다르고 효과 차이 없음.
- **카테고리 색상 선택**: HTML5 `<input type="color">` 사용. 별도 컬러피커 라이브러리 도입 X.
- **WakeLock**: v1 포함. `navigator.wakeLock` API를 in-flight 단계 진입 시 `request('screen')`, landed/abort 시 release. 미지원 브라우저는 silent fallback.

## 15. a11y / 인터랙션 fallback

- **Drag-to-tear stub**: 마우스 drag / 터치 drag 둘 다 지원. 키보드 사용자는 `Space` 길게누르기(500ms)로 fallback. 스크린리더에는 "Tear boarding pass to start your flight" aria-label 제공.
- **모바일 터치 검증**: 통합 테스트에는 마우스만, 수동 검증 항목에 iOS Safari / Android Chrome drag 동작 포함.
- **저감 모션 사용자**: `prefers-reduced-motion`이면 Framer Motion transition을 200ms → instant로 변경, 구름 애니메이션 정지.
