# 적자생존 배포 안내

이 폴더는 Manus 없이 동작하는 정적 웹앱입니다.

## 포함 파일

- `index.html`
- `styles.css`
- `app.js`

서버나 데이터베이스 없이 브라우저 `localStorage`에 기록을 저장합니다.

## 주요 기능

- 정비 기록 작성/수정/삭제
- 오늘 작업 및 매출 집계
- 차량번호/작업내용 검색
- 작업 템플릿 빠른 입력
- CSV 내보내기
- 번호판 촬영 가이드 UI
- 브라우저 OCR 기반 번호판 자동 입력
- 차량 번호 입력 시 이전 작업 이력 자동 표시

번호판 OCR은 브라우저에서 `tesseract.js`를 CDN으로 불러와 실행합니다.
정적 앱 특성상 Clova OCR, Google Vision 같은 서버 API 키 기반 서비스는 포함하지 않았습니다.

## 가장 쉬운 배포

1. https://app.netlify.com/drop 접속
2. `motolog-standalone` 폴더를 드래그해서 업로드
3. 생성된 URL을 휴대폰에서 열기

## 다른 정적 호스팅

Vercel, Cloudflare Pages, GitHub Pages에도 그대로 업로드할 수 있습니다.
빌드 명령은 필요 없고, 배포 폴더는 이 폴더 자체입니다.
