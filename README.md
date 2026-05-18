# ✈ FocusFlight Web

**비행 의식으로 감싼 개인용 집중 타이머.** 출발지/목적지를 고르고, 보딩패스를 발권하고, stub을 떼어 비행을 시작하면 — 검정 세계 지도 위로 비행기가 great-circle 항로를 따라 움직이며 카운트다운이 흐른다. 비행 중에는 엔진 ambient + 기장 안내방송 + lofi 음악(또는 YouTube URL)이 자동 재생.

🚀 **Live demo**: https://focusflight-web.vercel.app

> ⚠ **MVP / Claude-built notice**
> 이 프로젝트는 **Claude(Anthropic AI)와의 협업으로만 작성된 MVP**입니다. 사람이 직접 입력한 코드는 없고, 요구사항/피드백/디자인 결정만 사람이 제공했습니다. 운영 제품이 아니라 개인 사용 + 포트폴리오 목적의 빠른 프로토타입입니다.

---

## ✨ Features

### 비행 의식 UX
- **Booking** — 시간(15/25/45/60/90분/커스텀), 카테고리(일/공부/독서), 출발지/목적지 국가(26개), in-flight 음악 선택
- **Boarding Pass** — Framer Motion spring 등장, IATA 코드 + 카테고리 + 자동 배정 좌석
- **Check-in** — Stub을 오른쪽으로 드래그해 찢는 인터랙션 (또는 Space 길게누르기)
- **In-Flight** — 풀스크린 세계 지도 + great-circle 비행경로 점선 + 오렌지 비행기가 진행률에 따라 호 위를 이동
- **Landed** — 완료 화면 + 다음 비행 예약

### 오디오
- **이륙 사운드** + **엔진 ambient** (seamless loop) + **기장 안내방송** (macOS `say` + ffmpeg PA 필터) + **착륙 챠임**
- **Lofi 트랙 4종** — Cafe / Rain / Low Wind / High Tones (ffmpeg procedural noise)
- **YouTube URL** 직접 입력 → iframe embed로 자동재생, `enablejsapi=1` postMessage로 볼륨 제어
- **엔진 ducking** — 음악 재생 시 엔진 볼륨 35%로 자동 감쇠
- **사운드 패널** — 인플라이트 중에도 효과음/음악 볼륨 독립 조절

### 영속화 & 신뢰성
- localStorage 기반 — 새로고침/탭 닫기 후 ResumeModal로 복구
- 음악도 elapsed time 만큼 seek해서 이어재생 (`<audio>.currentTime` + YouTube `&start=`)
- WakeLock API로 in-flight 중 화면 sleep 방지
- 만료된 비행은 Resume 시 즉시 land 처리
- 시계 변경/시스템 슬립 견딤 (`Date.now()` 기반 타이머)

### Stats 대시보드
- 주간 집중 시간, streak 일수, 평균 비행 시간
- 카테고리 도넛 + 일별 막대 (Recharts)
- 기간 토글 (주/월/전체)
- 최근 비행 기록 테이블

---

## 🛠 Tech Stack

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Vite 7 + React 19 + TypeScript** | 가장 빠른 정적 SPA 빌드, 타입 안전성 |
| 스타일 | **Tailwind CSS 3** | 일관된 디자인 토큰 + 빠른 prototyping |
| 상태 관리 | **Zustand** | Redux 오버킬, Context는 새로고침 복구 미러링에 부담 |
| 애니메이션 | **Framer Motion 12** | drag-to-tear, 단계 전환 spring, 보딩패스 등장 |
| 지도 | **d3-geo + world-atlas (50m)** | Natural Earth 토포지오 + equirectangular 투영 |
| 차트 | **Recharts** | React-native, 가벼움 |
| 라우팅 | **React Router 7** | `/`, `/stats`, `/settings` |
| 테스트 | **Vitest + RTL + jsdom** | Vite 친화, 44개 테스트 |
| 배포 | **Vercel** | 정적 빌드 무료 호스팅, HTTPS 자동 |

**비밀 의존성 없음** — 환경변수 0개, 외부 API 0개, 모든 데이터는 클라이언트 localStorage.

---

## 🏗 Architectural Highlights

### Flight State Machine (`src/store/flightStore.ts`)
ActiveFlight는 4-step 상태머신 (`booking → boarding → checkin → inflight`). 새로고침 시 localStorage에서 복구하지만 — **MusicLayer 자동재생을 막기 위해** hydrate를 ResumeModal의 onResume 핸들러까지 지연시켰다.

### Great-Circle vs 2D Bezier Hybrid (`src/components/WorldMap.tsx`)
`d3-geo`의 `geoInterpolate`로 두 도시 간 측지선(96 samples)을 그리되, **antimeridian 교차** (예: ICN→JFK는 북극 경유) 검출 시에는 2D quadratic bezier로 fallback해 화면 안에 머무르게 처리. 비행기는 같은 곡선 위를 보간된 위치 + 접선 방향으로 회전.

### Audio Architecture (`src/lib/audio.ts` + `src/flight/MusicLayer.tsx`)
효과음(FX)은 Web Audio API + GainNode로 마스터 볼륨 + ducking 처리, 음악은 React-managed `<audio autoplay>` 또는 YouTube `<iframe>`으로 분리. AudioContext는 user gesture 안에서 `resume()` 호출되어야 하고, Framer Motion drag-end는 일부 브라우저에서 user gesture 컨텍스트를 잃어버려서 `<audio>` 선언적 렌더링 방식이 더 안정적.

### TDD-First Workflow
타이머/스토리지/통계/스토어는 모두 fail-first 테스트 → 최소 구현 → green 순서로 작성. 통합 테스트는 booking → landed 풀 플로우와 ResumeModal 시나리오 커버.

---

## 🚀 Local Development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # vitest watch
npm test -- --run    # 1회 실행 (44 tests)
npm run build        # dist/ 정적 빌드
```

---

## 📦 Deploy

### Vercel (현재 배포 방식)
```bash
npm i -g vercel
vercel deploy --yes
```
또는 GitHub 연동 시 `git push`마다 자동 재배포.

### Cloudflare Pages
동일한 정적 빌드 (`dist/`) 업로드.

---

## 🧪 Honest Limitations (MVP scope)

- **합성 사운드** — lofi 트랙들은 ffmpeg procedural noise. 실제 카페/숲 녹음 아님. 진짜 ambient는 YouTube URL로 사용.
- **출발지·목적지 좌표** — 각 국가의 대표 도시(주로 수도) 1곳 고정. 다른 공항 선택 불가.
- **트랜스-퍼시픽 항로** — 실제 great-circle은 북극 경유지만, 시각화에서는 2D bezier로 fallback해 지구 가운데를 가로지름 (실제 항로와 다름).
- **모바일 최적화** — 데스크탑 기준 디자인. 모바일 portrait에서는 일부 UI가 작게 보일 수 있음.
- **다국어** — 한국어 + 영어 키만.
- **인증/멀티 디바이스 동기화** — 없음. localStorage 단일 디바이스 한정.

---

## 📁 Project Structure

```
src/
├── App.tsx                      # Router + MusicLayer mount
├── flight/
│   ├── FlightMachine.tsx        # 단계 분기 + ResumeModal
│   ├── MusicLayer.tsx           # <audio> + <iframe> 선언적 렌더링
│   ├── ResumeModal.tsx
│   └── steps/{Booking,BoardingPass,CheckIn,InFlight,Landed}.tsx
├── components/
│   ├── WorldMap.tsx             # d3-geo + great-circle/bezier hybrid
│   ├── BoardingPassCard.tsx
│   ├── Countdown.tsx
│   ├── KpiCard.tsx
│   └── charts/{WeeklyBar,CategoryDonut}.tsx
├── store/
│   ├── flightStore.ts           # Zustand state machine + lastCompleted
│   └── settingsStore.ts
├── lib/
│   ├── audio.ts                 # AudioBus (FX only, ducking)
│   ├── timer.ts                 # Date.now() 기반 elapsed/remaining
│   ├── stats.ts                 # weekly / streak / category derive
│   ├── storage.ts               # localStorage abstraction + seed-merge
│   ├── notifications.ts
│   ├── wakelock.ts
│   └── youtube.ts               # URL → video ID parser
├── data/countries.ts            # 26개 국가 + lat/lng + IATA
└── lofi.ts                      # 4종 procedural 트랙 manifest

public/
├── sounds/{takeoff,engine,landing,captain_*}.mp3
└── lofi/{cafe,rain,wind,highs}.mp3

docs/
├── specs/2026-05-18-focusflight-web-design.md
└── plans/2026-05-18-focusflight-web-implementation.md
```

---

## 📜 Design Docs

본 프로젝트는 Claude와 함께 **brainstorming → spec → plan → implementation** 워크플로우로 작성됨:

- 📋 **Spec**: [`docs/specs/2026-05-18-focusflight-web-design.md`](docs/specs/2026-05-18-focusflight-web-design.md) — 요구사항/아키텍처/엣지 케이스 결정
- 🗺 **Implementation Plan**: [`docs/plans/2026-05-18-focusflight-web-implementation.md`](docs/plans/2026-05-18-focusflight-web-implementation.md) — TDD 단계별 task 분해

---

## License

Personal project. Not licensed for redistribution. Code is shown publicly as a portfolio reference.
