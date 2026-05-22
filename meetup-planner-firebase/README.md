# 모여봐 🗓️

친구들과 약속을 쉽게 잡을 수 있는 웹 앱입니다.

## 기능

- ✨ **방 만들기 / 참가하기** - 방 이름, 코드(6자리)로 참가
- 👤 **닉네임 & 프로필 사진** - 각자 프로필 설정
- 📸 **방 프로필 사진** - 방 대표 이미지 설정
- 💬 **채팅** - 의견 나누기
- 📅 **날짜 투표** - 캘린더에서 가능한 날짜 선택
- 📍 **장소 후보** - 직접 입력 or 네이버 지도 연동

## 로컬 실행

```bash
npm install
cp .env.example .env.local
# .env.local에 네이버 지도 클라이언트 ID 설정 (선택사항)
npm run dev
```

## Vercel 배포

```bash
npm run build
vercel deploy
```

또는 GitHub 연동 후 Vercel 대시보드에서 자동 배포

### Vercel 환경변수 설정 (선택사항)
```
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_client_id
```

## 네이버 지도 API 설정

1. https://console.ncloud.com 접속
2. AI·NAVER API > Maps > Web Dynamic Map 신청
3. Geocoding 서비스도 함께 활성화
4. 발급된 Client ID를 환경변수에 설정
5. 허용 도메인에 배포 URL 추가

> 네이버 지도 없이도 "직접 입력" 모드로 장소를 추가할 수 있습니다.

## 기술 스택

- Next.js 15 (App Router)
- TypeScript
- Zustand (상태 관리, localStorage 영속성)
- Tailwind CSS
- 네이버 Maps API
