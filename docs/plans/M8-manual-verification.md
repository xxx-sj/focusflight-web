# M8 — Manual Verification Checklist

배포 전 직접 브라우저에서 확인할 항목.

## 데스크탑 (Chrome/Firefox/Safari)

- [ ] Home에서 "Book a flight" 클릭 → Booking step
- [ ] 시간(25min) + 카테고리 선택 → "Next" 가능
- [ ] Seat map에서 좌석 선택 → Boarding pass 화면
- [ ] Boarding pass spring 등장 애니메이션 동작
- [ ] Check-in stub을 드래그해서 찢기 (또는 Space 길게누르기)
- [ ] In-flight 화면: 카운트다운, 구름 애니메이션, 그라데이션 배경
- [ ] 시간 만료 시 Landed 화면 자동 표시
- [ ] "Book another" / "Home" 동작
- [ ] beforeunload 경고 (In-flight 중 새로고침 시도)
- [ ] In-flight 중 새로고침 → ResumeModal 표시 → Resume/Discard 둘 다 동작
- [ ] 만료된 비행 상태로 ResumeModal → Resume → 즉시 Landed 화면
- [ ] Stats 페이지: KPI 카드, 막대/도넛, 최근 비행 테이블
- [ ] Stats 기간 토글 (주/월/전체)
- [ ] Settings: 카테고리 추가/삭제, 볼륨 슬라이더, 알림 토글
- [ ] 알림 거부 시 토스트 + 토글 자동 OFF

## 모바일 (iOS Safari, Android Chrome)

- [ ] Drag-to-tear 터치 동작
- [ ] In-flight 풀스크린, WakeLock으로 화면 sleep 방지
- [ ] 사운드 재생 (사용자 제스처 후, autoplay 정책 준수)
- [ ] Stats 차트 반응형 레이아웃

## 사운드 (4개 mp3 추가 후)

- [ ] Stub tear → tear 사운드
- [ ] In-flight 진입 → takeoff → engine loop fade in
- [ ] 시간 만료 → engine fade out → landing 사운드
- [ ] Mute 토글 즉시 반영
- [ ] Settings 볼륨 슬라이더 즉시 반영

## 접근성

- [ ] macOS 시스템 설정 → 모션 줄이기 활성화 후 reload → 애니메이션 즉시 (구름 정지, 단계 전환 즉시)
- [ ] Stub에 aria-label 존재 (DevTools 확인)
- [ ] 키보드만으로 Booking → Check-in 가능 (Tab + Enter + Space)

## 배포 후

- [ ] 라이브 URL에서 전체 플로우 다시 1회 검증
- [ ] localStorage가 도메인별로 분리되는 것 확인 (개발 vs 프로덕션)
