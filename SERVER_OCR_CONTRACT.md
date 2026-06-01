# 한국 이륜차 번호판 서버 OCR 연동 규격

앱의 `서버 번호판 인식` 버튼은 아래 형식의 HTTP API를 호출합니다.

## 요청

`POST https://your-server.example.com/plate-ocr`

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "plateType": "korean-motorcycle",
  "expectedPattern": "지역명 + 한글 + 숫자4자리"
}
```

## 응답

서버는 아래 중 하나 이상을 반환하면 됩니다.

```json
{
  "plate": "경기수원가0591",
  "text": "경기 수원 가 0591",
  "candidates": ["경기수원가0591", "수원가0591"]
}
```

앱은 `plate`, `text`, `candidates`를 다시 한 번 정리해서 차량번호 입력칸에 넣습니다.

## 서버 구현 권장

- 한국 이륜차 번호판 전용 탐지 모델로 번호판 영역을 먼저 자릅니다.
- 자른 영역을 OCR 모델에 넣습니다.
- 최종 결과는 `지역명 + 한글 + 숫자4자리` 패턴을 우선 반환합니다.
- 브라우저 앱 도메인에서 호출할 수 있도록 CORS를 허용해야 합니다.

