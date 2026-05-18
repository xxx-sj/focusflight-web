# FocusFlight Web

비행 의식 UX로 감싼 개인용 집중 타이머. 좌석을 고르고 보딩패스를 발권하고 stub을 떼어 비행을 시작 — 비행 중에는 카운트다운과 엔진 앰비언트 사운드와 함께 집중한다.

## 개발

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest watch 모드
npm test -- --run   # 1회 실행
npm run build    # dist/ 정적 빌드
```

## 사운드 파일 추가

`public/sounds/` 디렉토리에 4개의 mp3 파일을 직접 추가해야 한다 (CC0/CC-BY 권장):
- `takeoff.mp3` — 이륙 사운드 (~6s)
- `engine.mp3` — 비행 중 엔진 앰비언트 (~20s, seamless loop)
- `landing.mp3` — 착륙 챠임 (~4s)
- `tear.mp3` — 보딩패스 stub 찢는 효과음 (~0.4s)

추천 소스: [freesound.org](https://freesound.org/) (CC0 필터), [Pixabay](https://pixabay.com/sound-effects/).

파일이 없어도 앱은 동작한다 — 사운드는 silent fallback된다.

## 배포

### Vercel
- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- 환경변수 없음

### Cloudflare Pages
- 동일하게 정적 빌드 업로드

## 스택

Vite + React 19 + TypeScript + Tailwind CSS 3 + Framer Motion + Zustand + React Router + Recharts + Vitest

## 문서

- Spec: [`docs/specs/2026-05-18-focusflight-web-design.md`](docs/specs/2026-05-18-focusflight-web-design.md)
- Plan: [`docs/plans/2026-05-18-focusflight-web-implementation.md`](docs/plans/2026-05-18-focusflight-web-implementation.md)
