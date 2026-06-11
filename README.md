# 마이홈 (Myhome) — 통합 커뮤니티 관리 시스템

React + Express + SQLite/MySQL/MariaDB/PostgreSQL 기반의 풀스택 웹 애플리케이션

<!-- CI 배지: 아래 URL을 실제 GitHub 레포지토리 경로로 변경하세요 -->
<!-- [![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/ci.yml) -->

---

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [프로젝트 구조](#프로젝트-구조)
- [환경변수 설정](#환경변수-설정)
- [데이터베이스 설정](#데이터베이스-설정)
- [아키텍처](#아키텍처)
- [API 문서](#api-문서)
- [Docker 배포](#docker-배포)
- [보안](#보안)
- [개발 가이드](#개발-가이드)
- [트러블슈팅](#트러블슈팅)

---

## 주요 기능

### 인증 & 권한 관리
- JWT 기반 인증 (HttpOnly 쿠키, 자동 토큰 갱신)
- 2단계 인증 (2FA/TOTP) 지원
- 역할 기반 접근 제어 (RBAC)
- 멀티탭 자동 로그아웃 (storage event 동기화)
- 기기 지문 기반 세션 관리

### 게시판 시스템
- 다중 게시판 (권한별 접근 제어, 비활성 게시판 차단)
- CKEditor 5 WYSIWYG 에디터
- 파일 첨부 (이미지, 문서), 이미지 인라인 업로드
- 중첩 댓글 시스템 (낙관적 업데이트)
- 이모지 리액션 (like/love/haha/wow/sad/angry)
- 게시글 태그 (색상 지정 가능)
- 비밀 게시글 (비밀번호 보호)
- 게시글 고정 (관리자/매니저)
- 읽음 표시 (파란 점), 북마크
- 자동저장 (30초), 이중 제출 방지, 임시저장 복원
- OG 메타태그 동적 업데이트

### 위키
- 슬러그 기반 계층형 위키 페이지
- 버전 관리 (Diff 뷰어)
- 발행/비발행 상태 관리

### 메모
- 사용자별 스티키 메모 보드
- 색상 지정, 고정(pin), 드래그 정렬

### 이벤트 캘린더
- FullCalendar 기반 드래그 & 드롭 일정 관리
- 반복 일정 (일/주/월/연)
- 권한별 이벤트 생성 제어

### 알림
- 폴링 기반 신규 알림 감지 (30초 주기, 마지막 확인 ID 기준)
- 헤더 알림 벨 + 읽지 않은 개수 표시

### 전역 검색
- ⌘K / Ctrl+K 단축키 CommandPalette (게시글·메모 통합 검색, 카테고리 분류)

### 관리자 기능
- 사용자 관리 (역할 변경, 계정 활성/비활성)
- 게시판 관리 (생성, 수정, 권한 설정)
- 역할/권한 관리 (시각화 그래프 포함)
- 태그 관리
- 이벤트 관리
- 보안 로그 / 에러 로그 / 감사 로그 / 로그인 기록
- 신고 관리
- IP 규칙 관리
- Rate Limit 설정
- 사이트 설정

### UI/UX
- 다크/라이트 모드
- 반응형 디자인
- 가상 스크롤 (대용량 목록 최적화)
- Framer Motion 애니메이션

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 라이브러리 |
| TypeScript | 6 | 타입 안정성 |
| Vite | 8 | 빌드 도구 (HMR) |
| Tailwind CSS | 4 | 스타일링 |
| Zustand | 5 | 전역 상태 관리 |
| React Query | 5 | 서버 상태 캐싱 |
| React Router | 7 | 라우팅 |
| CKEditor 5 | 48 | WYSIWYG 에디터 (`@ckeditor/ckeditor5-react` 11) |
| FullCalendar | 6 | 캘린더 (월/주/일/목록 뷰, 드래그&드롭) |
| Uppy | 5 | 파일 업로드 |
| Framer Motion | 12 | 애니메이션 |
| DOMPurify | 3 | XSS 방지 |
| Lucide React | 1 | 아이콘 |
| Vitest | - | 테스트 러너 |

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| Express | 5 | 웹 프레임워크 |
| TypeScript | 6 | 타입 안정성 |
| Sequelize | 6 | ORM (다중 DB 지원) |
| jsonwebtoken | 9 | JWT 인증 |
| bcryptjs | 3 | 비밀번호 해싱 |
| Speakeasy | 2 | 2FA (TOTP) |
| Winston | 3 | 구조화 로깅 |
| Multer | 2 | 파일 업로드 |
| Sharp | - | 이미지 최적화 (아바타) |
| Zod | 4 | 요청 유효성 검사 |
| Helmet | 8 | 보안 헤더 |
| Jest | - | 테스트 러너 (SQLite in-memory) |

### 데이터베이스 (선택)

| DB | 권장 용도 |
|----|-----------|
| SQLite | 개발, 소규모 (기본값) |
| MySQL/MariaDB | 중규모 서비스 |
| PostgreSQL | 대규모, 프로덕션 |

---

## 빠른 시작

### 사전 요구사항

| 도구 | 최소 버전 | 확인 명령 |
|------|-----------|-----------|
| Node.js | **20.x 이상** | `node --version` |
| npm | 9.x 이상 | `npm --version` |

> **Windows 사용자**: `npm run dev`, `npm run build`, `npm test` 등 기본 명령은 PowerShell / cmd.exe에서 정상 동작합니다.  
> 보조 스크립트(`db:indexes` 등)에서 문제가 생기면 Git Bash 또는 WSL2 환경에서 실행하세요.

### 1. 저장소 클론

```bash
# 아래 URL을 실제 레포지토리 주소로 변경하세요
git clone https://github.com/<owner>/<repo>.git
cd <repo>
```

### 2. 서버 설정

```bash
# 환경변수 설정 (반드시 JWT_SECRET 값 변경!)
cp server/.env.sample server/.env

cd server

# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:4000)
npm run dev
```

> **첫 실행 시** DB 테이블 생성 + 인덱스 + 기본 데이터(admin 계정, 역할, 사이트 설정) 초기화가 자동으로 진행됩니다 (약 10~30초).

### 3. 클라이언트 설정

서버가 `🚀 API 서버 시작` 메시지를 출력한 뒤 **새 터미널**에서 실행하세요.

```bash
cd client

# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:8080)
npm run dev
```

### 4. 접속

| 서비스 | URL |
|--------|-----|
| 클라이언트 | http://localhost:8080 |
| API 서버 | http://localhost:4000 |
| API 문서 (Swagger) | http://localhost:4000/api-docs |

> 기본값으로 **SQLite**를 사용하므로 별도 DB 설치 없이 바로 시작할 수 있습니다.

> ⚠️ **초기 로그인**: ID `admin` / 비밀번호는 `server/.env`의 `ADMIN_DEFAULT_PASSWORD` 값입니다.  
> 첫 로그인 후 반드시 비밀번호를 변경하세요.

---

## 프로젝트 구조

```
myhome/
├── client/                    # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── api/               # Axios API 클라이언트
│   │   ├── components/        # React 컴포넌트
│   │   │   ├── Dashboard/     # 사이드바, 알림 등 대시보드 레이아웃
│   │   │   ├── admin/         # 관리자 탭 컴포넌트
│   │   │   ├── boards/        # 게시판 컴포넌트 (PostListItem, ReactionPicker, TagBadge 등)
│   │   │   ├── common/        # 공통 컴포넌트 (LoadingStates, ErrorBoundary 등)
│   │   │   ├── editor/        # CKEditor 래퍼, 파일 업로드
│   │   │   └── wiki/          # 위키 컴포넌트 (DiffViewer, History)
│   │   ├── config/            # 클라이언트 상수
│   │   ├── constants/         # 게시판 타이틀 등 상수
│   │   ├── contexts/          # Theme 컨텍스트
│   │   ├── hooks/             # 커스텀 훅 (useDebouncedValue, usePostDetail 등)
│   │   ├── pages/             # 페이지 컴포넌트
│   │   │   ├── admin/         # 관리자 페이지 (라우트 기반 탭)
│   │   │   ├── boards/        # 게시판, 게시글, 댓글, 에디터
│   │   │   ├── components/    # 페이지 전용 컴포넌트 (FullCalendar 래퍼 등)
│   │   │   ├── memos/         # 메모 보드
│   │   │   ├── wiki/          # 위키 페이지
│   │   │   └── *.tsx          # 인증(Login, Register, 2FA), Dashboard, Profile 등
│   │   ├── providers/         # React Query Provider
│   │   ├── store/             # Zustand 스토어 (auth, siteSettings)
│   │   ├── styles/            # 글로벌 CSS, 디자인 시스템
│   │   ├── test/              # 클라이언트 테스트
│   │   ├── types/             # TypeScript 타입 정의
│   │   └── utils/             # 유틸리티 함수
│   ├── package.json
│   └── vite.config.ts
│
├── server/                    # 백엔드 (Express + Sequelize)
│   ├── src/
│   │   ├── config/            # DB, 환경변수, Swagger, 상수 설정
│   │   ├── controllers/       # HTTP 요청/응답 처리
│   │   ├── middlewares/       # 인증, 권한, 보안, Rate Limit
│   │   │   └── upload/        # Multer 파일 업로드 미들웨어 (file/image/avatar)
│   │   ├── models/            # Sequelize 모델 (30개)
│   │   ├── routes/            # 라우트 정의
│   │   ├── services/          # 비즈니스 로직
│   │   ├── types/             # TypeScript 타입 확장
│   │   ├── utils/             # logger, response, pagination 등
│   │   └── validators/        # Zod 스키마 유효성 검사
│   ├── src/__tests__/         # Jest 테스트 (SQLite in-memory)
│   ├── src/scripts/           # DB 마이그레이션, 시드 스크립트
│   ├── uploads/               # 업로드 파일 저장소 (gitignored)
│   └── package.json
│
├── server/.env.sample         # 환경변수 템플릿 (로컬 개발용)
├── .github/workflows/ci.yml   # GitHub Actions CI
├── nginx.conf                 # Nginx 리버스 프록시 설정
├── docker-compose.yml         # Docker Compose (MariaDB + App + Nginx)
├── Dockerfile                 # 멀티스테이지 빌드
└── README.md
```

---

## 환경변수 설정

`server/.env.sample`을 `server/.env`로 복사하고 값을 수정하세요.

```bash
cp server/.env.sample server/.env
```

### 필수 설정

```env
# 보안 (반드시 변경!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# 데이터베이스
DB_TYPE=sqlite
DB_STORAGE=./database.sqlite

# 서버
PORT=4000
NODE_ENV=development
```

### 전체 환경변수 레퍼런스

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NODE_ENV` | `development` | `production`이면 시크릿 검증·보안 헤더·쿠키 Secure가 강화됨 |
| `PORT` | `4000` | API 서버 포트 |
| `JWT_SECRET` | — | **필수.** 액세스 토큰 서명 키 (프로덕션은 32자 이상, 플레이스홀더 금지) |
| `JWT_REFRESH_SECRET` | — | **필수.** 리프레시 토큰 서명 키 (JWT_SECRET과 달라야 함) |
| `ADMIN_DEFAULT_PASSWORD` | `ChangeMe_2024!` | 초기 admin 계정 비밀번호 (프로덕션은 약한 값 부팅 차단) |
| `COOKIE_SECURE` | (프로덕션 `true`) | 인증 쿠키 Secure 플래그. HTTP 인트라넷은 `false` 명시 |
| `DB_TYPE` | `sqlite` | `sqlite` / `mysql` / `mariadb` / `postgresql` |
| `DB_STORAGE` | `./database.sqlite` | SQLite 파일 경로 |
| `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | — | 非 SQLite DB 접속 정보 |
| `DB_SSL` / `DB_SSL_CA` | `false` / — | DB SSL 사용 여부 및 CA 인증서 (PostgreSQL 등) |
| `ALLOWED_ADMIN_IPS` | (미설정=전체 허용) | 관리자 API 접근 허용 IP (쉼표 구분). 프로덕션 미설정 시 부팅 경고 |
| `CLIENT_URL` / `CORS_ORIGINS` / `ALLOWED_ORIGINS` | — | CORS 허용 오리진 (쉼표 구분) |
| `CORS_IP_PATTERN` | — | CORS 허용 사설 IP 정규식 패턴 |
| `CORS_ALLOW_ALL` | `false` | 폐쇄망 전용 — 모든 오리진 허용 (사용 주의) |
| `SECURITY_LOG_RETENTION_DAYS` | `90` | 보안 로그 보존 기간(일) |
| `ERROR_LOG_RETENTION_DAYS` | `30` | 에러 로그 보존 기간(일) |

> 파일 업로드 제한(용량, 개수, 허용 확장자) 등 운영 설정은 환경변수가 아닌 **관리자 페이지 → 사이트 설정**에서 DB 기반으로 동적 관리됩니다.

---

## 데이터베이스 설정

기본적으로 **SQLite**를 사용하여 별도 설치 없이 바로 시작할 수 있습니다.

다른 DB로 전환하려면 [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)를 참고하세요.

| DB | 환경변수 |
|----|---------|
| SQLite | `DB_TYPE=sqlite` + `DB_STORAGE=./database.sqlite` |
| MySQL | `DB_TYPE=mysql` + `DB_HOST/PORT/USER/PASSWORD/NAME` |
| MariaDB | `DB_TYPE=mariadb` + `DB_HOST/PORT/USER/PASSWORD/NAME` |
| PostgreSQL | `DB_TYPE=postgresql` + `DB_HOST/PORT/USER/PASSWORD/NAME` |

> 테이블 스키마는 서버 첫 실행 시 Sequelize `sync`로 자동 생성됩니다. SQLite는 `site_settings` 컬럼 누락을 자동 보정합니다.

---

## 아키텍처

### 데이터 모델 (Sequelize, 30개)

| 도메인 | 모델 |
|--------|------|
| **인증·사용자** | `User`, `Role`, `UserSession`, `LoginHistory` |
| **게시판·게시글** | `Board`, `BoardAccess`, `BoardManager`, `Post`, `PostTag`, `PostRead`, `PostLike`, `PostReaction`, `PostBookmark`, `Bookmark` |
| **댓글** | `Comment`, `CommentReaction` |
| **위키·메모** | `WikiPage`, `WikiRevision`, `Memo` |
| **이벤트** | `Event`, `EventPermission` |
| **태그·알림·신고** | `Tag`, `Notification`, `Report` |
| **운영·보안** | `SiteSettings`, `RateLimitSettings`, `IpRule`, `SecurityLog`, `ErrorLog`, `AuditLog` |

- `Post`·`Comment`은 `paranoid`(soft-delete). 게시글 삭제 시 자식(댓글/리액션/조회기록/태그)은 트랜잭션으로 함께 정리됩니다.
- 첨부파일은 `Post.attachments`에 JSON으로 저장(`{filename, originalname, size, mimetype, path}`), 파일은 `{timestamp}_{랜덤}` 형식(확장자 제거)으로 `uploads/files`에 저장됩니다.

### 권한 모델 (RBAC)

**기본 역할** (삭제 불가: `admin`/`manager`/`guest`)

| 역할 | 설명 |
|------|------|
| `admin` | 전체 관리자 — 모든 게시판·관리 기능 접근 |
| `manager` | 매니저 — 게시판 관리, 고정, 신고 처리 등 |
| `user` | 일반 사용자 |
| `guest` | 최소 권한 (역할 삭제 시 마이그레이션 대상) |

관리자 페이지에서 **커스텀 역할**을 생성하고 게시판별 권한을 부여할 수 있습니다.

**권한 레이어**

| 레이어 | 권한 | 적용 대상 |
|--------|------|-----------|
| 게시판 접근 (`BoardAccess`) | `canRead` / `canWrite` / `canDelete` | 역할별 게시판 단위 |
| 게시판 담당자 (`BoardManager`) | 특정 게시판 관리 위임 | 사용자 단위 |
| 이벤트 권한 (`EventPermission`) | `canRead` / `canCreate` / `canUpdate` / `canDelete` | 역할별 |
| 위키 권한 | 읽기/쓰기 역할 목록 | 역할별 |
| 개인 폴더 | 소유자 전용 (owner-only) | 사용자 개인 게시판 |

- 비활성 게시판(`isActive=false`)은 admin/manager를 제외하고 접근 차단됩니다.
- 비밀글은 비밀번호(`password`) 또는 허용 사용자 목록(`users`) 방식, E2EE 암호화 옵션을 지원합니다.

---

## API 문서

개발 모드에서 Swagger UI로 전체 API 문서를 확인할 수 있습니다.

**URL**: http://localhost:4000/api-docs (`NODE_ENV=development` 환경에서 자동 활성화)

### 주요 엔드포인트

| 그룹 | 경로 |
|------|------|
| 인증 | `/api/auth/*` |
| 2FA | `/api/2fa/*` |
| 게시판 | `/api/boards/*` |
| 게시글 | `/api/posts/*` |
| 댓글 | `/api/comments/*` |
| 이벤트 | `/api/events/*` |
| 메모 | `/api/memos/*` |
| 위키 | `/api/wiki/*` |
| 태그 | `/api/tags/*` |
| 알림 | `/api/notifications/*` |
| 사용자 | `/api/users/*` |
| 북마크 | `/api/bookmarks/*` |
| 신고 | `/api/reports/*` |
| 사이트 설정 | `/api/site-settings/*` |
| 관리자 | `/api/admin/*` |
| 파일 업로드 | `/api/uploads/*` |

---

## Docker 배포

### 빠른 실행

```bash
# 1. 환경변수 설정 — docker-compose는 프로젝트 루트의 .env를 읽습니다.
#    아래 변수가 필수입니다(미설정 시 컨테이너가 기동되지 않음):
cat > .env <<'EOF'
DB_PASSWORD=change-me-db-password
DB_ROOT_PASSWORD=change-me-root-password
JWT_SECRET=change-me-32-characters-minimum-secret
JWT_REFRESH_SECRET=change-me-different-32-characters-secret
ADMIN_DEFAULT_PASSWORD=change-me-admin-password
EOF
# ⚠️ 위 값들을 실제 강한 값으로 반드시 교체하세요.
#    (프로덕션 빌드 시 server/.env의 시크릿 검증이 플레이스홀더/약한 값을 거부합니다)

# 2. 이미지 빌드 & 컨테이너 실행
docker-compose up -d --build

# 3. 로그 확인 (첫 실행 시 DB 초기화 ~30초 소요)
docker-compose logs -f app

# 4. 중지
docker-compose down

# 데이터 포함 완전 삭제 (주의!)
docker-compose down -v
```

> **참고**: 클라이언트 정적 파일은 Docker 이미지 빌드 시 자동으로 포함되어 Nginx로 서빙됩니다.  
> 호스트에 `client/dist`를 별도로 빌드할 필요가 없습니다.

### Nginx IP 제한 안내

`nginx.conf`는 기본적으로 **내부 네트워크(192.168.x.x, 172.16.x.x)만 허용**하도록 설정되어 있습니다.  
인터넷에서 직접 접근하려면 `nginx.conf`의 IP 제한 블록을 수정하세요:

```nginx
# nginx.conf — 공인 IP 접근 허용 시 아래 블록 주석 처리 또는 삭제
# allow 192.168.0.0/16;
# allow 172.16.0.0/12;
# allow 127.0.0.1;
# deny all;
```

### 서비스 구성

| 서비스 | 이미지 | 포트 |
|--------|--------|------|
| MariaDB | mariadb:11 | 3306 |
| App (Node) | node:20 | 4000 |
| Nginx | nginx:alpine | 80 |

---

## 보안

### 적용된 보안 기능

- HttpOnly 쿠키 기반 JWT (XSS 방지)
- 2단계 인증 (TOTP/Google Authenticator)
- CORS 설정
- Rate Limiting (전체 / API / 로그인별 개별 제한)
- 동적 Rate Limit (DB 기반 관리자 설정)
- SQL Injection 방지 (ORM 파라미터 바인딩 + Zod 유효성 검사)
- XSS 방지 (클라이언트 DOMPurify + 서버 sanitize-html)
- 파일 업로드 검증 (MIME 타입 + 매직넘버, 경로 조작 방지, 확장자 블록리스트, 확장자 제거 저장)
- 첨부파일 다운로드 인가 (게시판 읽기 권한 + 비밀글 접근 검증 — `/api/uploads/download` 단일 경로, 정적 서빙 우회 차단)
- Helmet 보안 헤더 (CSP, HSTS, nosniff 등)
- CSRF 미들웨어 (X-Requested-With 검증)
- IP 화이트리스트 (Nginx + 앱 레벨), 프로덕션 미설정 시 부팅 경고
- 비밀번호 재설정 토큰 SHA-256 해싱 (DB 저장), bcryptjs 비밀번호 해싱
- 로그아웃/비밀번호 변경 시 tokenVersion 증가로 기존 세션 즉시 무효화
- 프로덕션 시크릿 검증 (JWT 시크릿/admin 비밀번호가 플레이스홀더·약한 값이면 부팅 차단)
- 쿠키 `Secure` 플래그 프로덕션 기본 적용 (HttpOnly + SameSite=Lax)
- 보안 이벤트 자동 로깅

### 배포 전 보안 체크리스트

- [ ] `.env` 파일을 Git에 커밋하지 않기
- [ ] `JWT_SECRET` 32자 이상 랜덤 값으로 변경
- [ ] `ADMIN_DEFAULT_PASSWORD` 변경 후 삭제
- [ ] HTTPS 적용 (Let's Encrypt 등)
- [ ] `ALLOWED_ADMIN_IPS` 설정으로 관리자 API 제한
- [ ] 정기적인 의존성 업데이트 (`npm audit`)

---

## 개발 가이드

### 로컬 검증 (CI 통과 기준)

```bash
# 서버
cd server
npx tsc --noEmit       # TypeScript 타입 에러 0개
npm run lint           # ESLint 경고/에러 0개
npm run format:check   # Prettier 포맷 일치
npm test               # Jest 테스트 통과

# 클라이언트
cd client
npx tsc --noEmit
npm run lint
npm run format:check
npm run build          # Vite 빌드 성공
```

### npm 스크립트 레퍼런스

**서버 (`server/`)**

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 (nodemon + ts-node, 포트 4000) |
| `npm run build` | 프로덕션 빌드 (`tsc` → `dist/`) |
| `npm start` | 빌드 결과 실행 (`node dist/index.js`) |
| `npm test` | Jest 테스트 (SQLite in-memory) |
| `npm run lint` / `lint:fix` | ESLint 검사 / 자동 수정 |
| `npm run format` / `format:check` | Prettier 포맷 적용 / 검사 |
| `npm run setup:{sqlite\|mysql\|mariadb\|postgresql}` | `.env`에 DB 설정 작성 |
| `npm run db:indexes` | DB 인덱스 생성 |
| `npm run init:roles` | 기본 역할 초기화 |
| `npm run install:db-drivers` | MySQL/PostgreSQL 드라이버 설치 |

**클라이언트 (`client/`)**

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | Vite 개발 서버 (포트 8080, HMR) |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm test` / `test:watch` | Vitest 테스트 |
| `npm run lint` / `lint:fix` | ESLint 검사 / 자동 수정 |
| `npm run format` / `format:check` | Prettier 포맷 적용 / 검사 |

### 테스트

```bash
cd server && npm test
```

- SQLite in-memory DB 사용 (실제 DB 영향 없음)
- 테스트 파일: `server/src/__tests__/`

### 데이터베이스 초기화 스크립트

> 테이블 생성과 기본 데이터(admin 계정·역할·사이트 설정) 시드는 **서버 첫 실행 시 자동**으로 수행됩니다. 아래는 보조 스크립트입니다.

```bash
# DB 환경변수 자동 설정 (.env에 DB 항목 작성) — sqlite / mysql / mariadb / postgresql
cd server && npm run setup:sqlite

# DB 인덱스 생성
cd server && npm run db:indexes

# 역할 초기화 (선택)
cd server && npm run init:roles

# 추가 DB 드라이버 설치 (MySQL/PostgreSQL 사용 시)
cd server && npm run install:db-drivers
```

### 코드 스타일

- **TypeScript strict mode** 적용
- **ESLint** + **Prettier** (`.prettierrc` 참고)
- 미사용 파라미터는 `_` 접두사 사용
- `console.log` 대신 `logInfo()` / `logError()` 사용
- `res.json()` 대신 `sendSuccess()` / `sendError()` 사용

---

## 트러블슈팅

### 포트 충돌 (EADDRINUSE)

```bash
# Mac/Linux — 포트 점유 프로세스 확인
lsof -i :4000
lsof -i :8080

# Windows
netstat -ano | findstr :4000

# 서버 포트 변경: server/.env
PORT=5000

# 클라이언트 API 대상 변경: client/.env.local 파일 생성
VITE_API_URL=http://localhost:5000
```

### 데이터베이스 초기화 (처음부터 다시 시작)

```bash
# SQLite
rm server/database.sqlite
cd server && npm run dev   # 재실행 시 자동 재생성

# MySQL/MariaDB/PostgreSQL
# DB 접속 후:
# DROP DATABASE myhome;
# CREATE DATABASE myhome CHARACTER SET utf8mb4;
```

### Windows에서 db:indexes 실패

`db:indexes` 스크립트는 `cross-env`로 `NODE_ENV`를 설정하므로 PowerShell/cmd.exe에서도 동작하지만,
문제가 있으면 Git Bash 또는 WSL2에서 실행하세요:

```bash
# Git Bash / WSL2
cd server && npm run db:indexes
```

### Docker — nginx가 빈 화면 표시

정적 파일 볼륨 초기화 순서 문제일 수 있습니다. 아래 명령으로 볼륨을 재생성하세요:

```bash
docker-compose down -v
docker-compose up -d --build
```

---

## 라이센스

MIT License

---

## 기여

버그 리포트, 기능 제안, Pull Request를 환영합니다.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request to `https://github.com/<owner>/<repo>`
