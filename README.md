# ⏱️ 인간 스톱워치 (Human Stopwatch) - HTML 버전

빌드 도구 없이 그대로 웹서버에 올리기만 하면 동작하는 순수 HTML/CSS/JS 버전입니다.
React/Vite 버전과 기능은 동일하며, Supabase JS는 CDN으로 불러옵니다.

- 🎮 참가자용 게임 화면: `index.html`
- 🏆 TV 모드 실시간 랭킹: `ranking.html`
- ⚙️ 관리자 페이지: `admin.html`

## 폴더 구조

```
index.html          게임 화면
ranking.html         TV 모드 실시간 랭킹
admin.html           관리자 페이지
css/styles.css        디자인 시스템 (다크모드 포함, Apple 스타일 미니멀 UI)
js/config.js          ⚙️ Supabase URL/Key, 관리자 이메일 설정 (직접 수정)
js/supabaseClient.js  Supabase 클라이언트 초기화
js/theme.js           다크/라이트 모드 토글
js/format.js          시간/오차 포맷팅 유틸
js/csv.js             CSV 다운로드/업로드 유틸 (관리자용)
js/rankingApi.js       scores / app_settings 테이블 접근 함수 모음
js/game.js            게임 화면 로직 (index.html)
js/ranking.js          TV 모드 로직 (ranking.html)
js/admin.js            관리자 로직 (admin.html)
supabase/schema.sql    Supabase 테이블 / RLS / Realtime 설정 SQL
```

## 1. Supabase 설정

1. [supabase.com](https://supabase.com) 에서 새 프로젝트를 생성합니다.
2. `supabase/schema.sql` 내용을 Supabase Dashboard → **SQL Editor** 에서 전체 실행합니다.
   - `scores`, `app_settings` 테이블과 RLS 정책, Realtime publication이 함께 설정됩니다.
3. **Authentication → Users → Add user** 에서 관리자 계정을 이메일/비밀번호로 1개 생성합니다.
4. **Project Settings → API** 에서 `Project URL`, `anon public key` 를 확인합니다.

## 2. 설정 파일 수정

`js/config.js` 를 열어 아래 값을 채워주세요.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
  ADMIN_EMAIL: "admin@your-event.com",
};
```

## 3. 로컬에서 실행

빌드가 필요 없으므로 정적 파일 서버로 바로 열면 됩니다. (file:// 로 직접 열면 일부 브라우저에서 모듈/CORS 문제가 있을 수 있어 로컬 서버 사용을 권장합니다.)

```bash
# 예시: Python
python3 -m http.server 8080

# 예시: Node (http-server 패키지)
npx http-server -p 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 4. 배포

정적 파일이므로 Netlify, Vercel(정적 호스팅), GitHub Pages, Cloudflare Pages, 사내 웹서버 등 어디에나 폴더 전체를 업로드하면 바로 동작합니다. 별도의 빌드 과정이 없습니다.

## 주요 기능

### 게임 진행 (`index.html`)
- 시작 버튼 클릭 또는 **Enter** 키로 시작
- 3-2-1 카운트다운 → GO, GO 이후 화면에 시간이 전혀 표시되지 않음
- **STOP** 버튼 클릭 또는 **Space** 키로 측정 종료
- 결과 화면: 실제 기록, 목표 시간과의 오차, 닉네임 입력 후 랭킹 등록
- 등록 시 현재 순위 표시, 1위 갱신 시 NEW RECORD 애니메이션

### 랭킹 / TV 모드 (`ranking.html`)
- Supabase Realtime으로 자동 새로고침 없이 실시간 갱신
- 오차가 작은 순 → 동률이면 먼저 등록한 순으로 정렬, TOP10만 표시
- 하단에 최근 기록이 흐르는 티커(marquee), 1위 갱신 시 큰 화면 애니메이션

### 관리자 (`admin.html`)
- 비밀번호 로그인 (Supabase Auth 기반, 화면에는 비밀번호 입력창만 노출)
- 목표 시간 변경 / 전체 랭킹 초기화 / 개별 기록 삭제 / 닉네임 수정
- 랭킹 CSV 다운로드 및 업로드 (행사 종료 후 재등록용)

## 참고 사항

- 관리자 인증은 Supabase Auth 이메일/비밀번호 로그인을 사용합니다. anon key는 브라우저에 노출되는 값이므로,
  기록의 수정/삭제/설정 변경 권한은 RLS 정책으로 "로그인한 사용자"에게만 허용되어 있습니다.
- 모바일/PC 반응형, Space=STOP, Enter=시작 키보드 지원, 다크모드(localStorage 저장), Pretendard 폰트(CDN).
- Framer Motion 대신 CSS Keyframe 애니메이션으로 동일한 연출(카운트다운 팝인, STOP 펄스, 신기록 컨페티 등)을 구현했습니다.
