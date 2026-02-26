# i18n Expansion: en, es, pt-BR, id, ja, ko

## Phase 1: Infrastructure Config
- [x] 1. `config.ts` — locales 배열에 6개 locale 추가, Locale 타입 갱신
- [x] 2. `routing.ts` — locales 목록 업데이트 + `localeCookie` 설정 추가 (z-i18n v4 권장)
- [x] 3. `request.ts` — 동적 import 패턴으로 변경
- [x] 4. `global.d.ts` — Locale 타입이 routing에서 자동 추론되므로 변경 불필요 (확인 완료)

## Phase 2: Message Files
- [x] 5. `en.json` 수정 — `productCard.signals` ICU plural 적용, accessibility 키 정리
- [x] 6. `ko.json` 수정 — `productCard.signals`, `demandSignals.signals` ICU plural 적용
- [x] 7. `es.json` 생성 — 스페인어 번역
- [x] 8. `pt-BR.json` 생성 — 브라질 포르투갈어 번역
- [x] 9. `id.json` 생성 — 인도네시아어 번역
- [x] 10. `ja.json` 생성 — 일본어 번역

## Phase 3: Language Switcher
- [x] 11. `accessibility` 키 리팩터링 — `switchToKorean/switchToEnglish` → `switchLanguage`
- [x] 12. `LocaleSwitcher` 컴포넌트 생성 + `navigation-bar.tsx` 적용

## Phase 4: Font & Final
- [x] 13. `layout.tsx` — Inter 폰트에 `latin-ext` 서브셋 추가
- [x] 14. 빌드 확인 — 성공
- [x] 15. 테스트 확인 — 기존 실패와 동일 (회귀 없음)
