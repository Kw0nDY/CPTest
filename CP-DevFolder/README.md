# 🤖 Collaboration Portal - AI-Powered Enterprise Platform

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue?style=for-the-badge&logo=docker)

**AI 기반 기업 협업 플랫폼으로, 데이터 통합, 자동화, 비즈니스 인텔리전스를 통합한 현대적인 웹 애플리케이션입니다.**

[🚀 데모 보기](#-데모)
[📖 문서](#-문서)
[🛠️ 설치](#-설치)
[🤝 기여하기](#-기여하기)

</div>

---

## ✨ 주요 기능

### 🧠 AI 모델 관리
- **다양한 AI 모델 지원**: ST-GCN, 기타 딥러닝 모델
- **모델 업로드 및 관리**: 직관적인 웹 인터페이스
- **실시간 모델 실행**: 웹소켓 기반 실시간 처리
- **모델 성능 분석**: 상세한 분석 및 시각화

### 🔄 데이터 파이프라인
- **시각적 파이프라인 빌더**: 드래그 앤 드롭 인터페이스
- **다양한 데이터 소스**: CSV, Excel, Google Sheets
- **실시간 데이터 처리**: 스트리밍 데이터 지원
- **데이터 품질 관리**: 자동 검증 및 정제

### 🤖 자동화 워크플로우
- **워크플로우 디자이너**: 시각적 자동화 도구
- **스케줄링**: 시간 기반 자동 실행
- **조건부 로직**: 복잡한 비즈니스 규칙 지원
- **모니터링**: 실시간 실행 상태 추적

### 📊 비즈니스 인텔리전스
- **대시보드**: 실시간 KPI 모니터링
- **데이터 시각화**: 차트 및 그래프
- **보고서 생성**: 자동화된 보고서
- **예측 분석**: AI 기반 인사이트

### 🔐 보안 및 인증
- **OAuth 2.0**: Google 로그인 지원
- **세션 관리**: 안전한 사용자 세션
- **권한 관리**: 역할 기반 접근 제어
- **데이터 암호화**: 전송 및 저장 시 암호화

---

## 🏗️ 기술 스택

### Frontend
- **React 18** - 현대적인 UI 라이브러리
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **Radix UI** - 접근성 높은 컴포넌트
- **Framer Motion** - 부드러운 애니메이션

### Backend
- **Node.js** - 서버 런타임
- **Express.js** - 웹 프레임워크
- **TypeScript** - 타입 안전성
- **WebSocket** - 실시간 통신

### Database
- **PostgreSQL** - 관계형 데이터베이스
- **Drizzle ORM** - 타입 안전한 ORM
- **Neon** - 클라우드 PostgreSQL

### AI & ML
- **Python** - AI 모델 실행
- **ST-GCN** - 시공간 그래프 컨볼루션 네트워크
- **PyTorch** - 딥러닝 프레임워크

### DevOps
- **Docker** - 컨테이너화
- **PM2** - 프로세스 관리
- **AWS EC2** - 클라우드 배포

---

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+
- Python 3.8+
- PostgreSQL
- Docker (선택사항)

### 1. 저장소 클론
```bash
git clone https://github.com/ttap112/CPTest.git
cd CPTest
```

### 2. 의존성 설치
```bash
# Node.js 의존성
npm install

# Python 의존성
pip install -r requirements.txt
```

### 3. 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env

# 환경 변수 편집
nano .env
```

### 4. 데이터베이스 설정
```bash
# 데이터베이스 마이그레이션
npm run db:push
```

### 5. 개발 서버 실행
```bash
# 개발 모드
npm run dev

# 또는 프로덕션 빌드
npm run build
npm start
```

---

## 🐳 Docker 배포

### Docker Compose 사용
```bash
# 환경 변수 설정
export DATABASE_URL="your-database-url"
export SESSION_SECRET="your-secret"

# Docker Compose로 실행
docker-compose up -d

# 상태 확인
docker-compose ps
docker-compose logs -f
```

### 수동 Docker 빌드
```bash
# 이미지 빌드
docker build -t collaboration-portal .

# 컨테이너 실행
docker run -d -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e SESSION_SECRET="your-secret" \
  collaboration-portal
```

---

## 📁 프로젝트 구조

```
CPTest/
├── 📁 client/                 # React 프론트엔드
│   ├── 📁 src/
│   │   ├── 📁 components/     # 재사용 가능한 컴포넌트
│   │   ├── 📁 pages/         # 페이지 컴포넌트
│   │   ├── 📁 hooks/         # 커스텀 훅
│   │   └── 📁 types/         # TypeScript 타입 정의
│   └── 📁 public/            # 정적 파일
├── 📁 server/                # Node.js 백엔드
│   ├── 📁 routes/           # API 라우트
│   ├── 📁 services/         # 비즈니스 로직
│   └── 📁 utils/            # 유틸리티 함수
├── 📁 shared/               # 공유 스키마 및 타입
├── 📁 uploads/              # 업로드된 파일
├── 📁 docs/                 # 문서
├── 📁 migrations/           # 데이터베이스 마이그레이션
├── 🐳 Dockerfile            # Docker 설정
├── 🐳 docker-compose.yml    # Docker Compose 설정
└── 📄 package.json          # 프로젝트 설정
```

---

## 🔧 주요 스크립트

| 스크립트 | 설명 |
|---------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run db:push` | 데이터베이스 마이그레이션 |
| `npm run check` | TypeScript 타입 체크 |

---

## 🌐 API 엔드포인트

### 인증
- `POST /api/auth/login` - 사용자 로그인
- `POST /api/auth/logout` - 사용자 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보

### AI 모델
- `GET /api/models` - 모델 목록 조회
- `POST /api/models/upload` - 모델 업로드
- `POST /api/models/execute` - 모델 실행
- `GET /api/models/:id/analysis` - 모델 분석

### 데이터 파이프라인
- `GET /api/pipelines` - 파이프라인 목록
- `POST /api/pipelines` - 파이프라인 생성
- `PUT /api/pipelines/:id` - 파이프라인 수정
- `DELETE /api/pipelines/:id` - 파이프라인 삭제

### 자동화
- `GET /api/automations` - 자동화 워크플로우 목록
- `POST /api/automations` - 워크플로우 생성
- `POST /api/automations/:id/execute` - 워크플로우 실행

---

## 🔒 환경 변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | ✅ |
| `NODE_ENV` | 실행 환경 (development/production) | ✅ |
| `PORT` | 서버 포트 (기본값: 3000) | ❌ |
| `SESSION_SECRET` | 세션 암호화 키 | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | ❌ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | ❌ |
| `ANTHROPIC_API_KEY` | Anthropic API 키 | ❌ |

---

## 🚀 배포 가이드

### AWS EC2 배포
자세한 배포 가이드는 [AWS 배포 가이드](docs/AWS_DEPLOYMENT_GUIDE.md)를 참조하세요.

### Docker 배포
```bash
# 프로덕션 빌드
docker build -t collaboration-portal:latest .

# 환경 변수와 함께 실행
docker run -d \
  --name collaboration-portal \
  -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e NODE_ENV=production \
  collaboration-portal:latest
```

---

## 🤝 기여하기

1. **Fork** 이 저장소
2. **Feature branch** 생성 (`git checkout -b feature/AmazingFeature`)
3. **Commit** 변경사항 (`git commit -m 'Add some AmazingFeature'`)
4. **Push** 브랜치 (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

### 개발 가이드라인
- TypeScript 사용
- ESLint 규칙 준수
- 테스트 코드 작성
- 커밋 메시지 컨벤션 준수

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 📞 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/ttap112/CPTest/issues)
- **문서**: [Wiki](https://github.com/ttap112/CPTest/wiki)
- **이메일**: support@example.com

---

## 🙏 감사의 말

- [React](https://reactjs.org/) - 훌륭한 UI 라이브러리
- [Node.js](https://nodejs.org/) - 강력한 서버 런타임
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 우선 CSS
- [Drizzle ORM](https://orm.drizzle.team/) - 타입 안전한 ORM

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요!**

Made with ❤️ by [Your Team Name]

</div>
