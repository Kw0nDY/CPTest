# 🚀 DXT Enterprise AI Fabric - VS Code 마이그레이션 완벽 가이드

## 📋 프로젝트 개요

**프로젝트명:** DXT Enterprise AI Fabric  
**Replit 프로젝트:** rest-express  
**버전:** 1.0.0  
**마이그레이션 날짜:** 2025-01-27

---

## 🛠️ 1. 언어 및 종속성 정보

### Node.js 환경
**필수 버전:** Node.js 20.x 이상  
**패키지 관리:** npm

### 메인 dependencies (package.json)
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.37.0",
    "@google-cloud/storage": "^7.17.0",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-*": "^1.x.x (다수의 UI 컴포넌트)",
    "@tanstack/react-query": "^5.60.5",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "express": "^4.21.2",
    "express-session": "^1.18.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "5.6.3",
    "vite": "^5.4.19",
    "wouter": "^3.3.5",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/express": "4.17.21",
    "@types/node": "20.16.11",
    "@types/react": "^18.3.11",
    "@vitejs/plugin-react": "^4.3.2",
    "drizzle-kit": "^0.30.4",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.1"
  }
}
```

### Python 환경 (AI 모델 처리용)
**필수 버전:** Python 3.11 이상

### Python dependencies (pyproject.toml)
```toml
[project]
name = "repl-nix-workspace"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.116.1",
    "numpy>=2.3.2",
    "openpyxl>=3.1.5",
    "pandas>=2.3.1",
    "pydantic>=2.11.7",
    "torch>=2.8.0",
]
```

---

## 🔐 2. 환경 변수 (Secrets)

### .env 파일 생성 (프로젝트 루트)
```env
# =============================================================================
# DXT Enterprise AI Fabric - Environment Configuration
# =============================================================================

# Database Configuration (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_0o2HTvrgDyiB@ep-bitter-frog-afe21mru.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
PGDATABASE="neondb"
PGHOST="ep-bitter-frog-afe21mru.c-2.us-west-2.aws.neon.tech"
PGPORT="5432"
PGUSER="neondb_owner"
PGPASSWORD="npg_0o2HTvrgDyiB"

# Google OAuth Configuration (설정 필요)
GOOGLE_CLIENT_ID="[Google OAuth 클라이언트 ID 입력]"
GOOGLE_CLIENT_SECRET="[Google OAuth 클라이언트 시크릿 입력]"

# AI Model Configuration (설정 필요)
ANTHROPIC_API_KEY="[Anthropic API 키 입력]"

# Express Session Security
SESSION_SECRET="DXT_Enterprise_AI_Fabric_Super_Secret_Key_2025_v1"

# Server Configuration
NODE_ENV="development"
PORT="5000"
```

### 환경 변수 설정 방법

1. **Google OAuth 설정:**
   - Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
   - 승인된 리디렉션 URI: `http://localhost:5000/auth/google/callback`
   - 클라이언트 ID와 시크릿을 .env 파일에 입력

2. **Anthropic API 키:**
   - https://console.anthropic.com/에서 API 키 발급
   - .env 파일의 ANTHROPIC_API_KEY에 입력

---

## 🗄️ 3. 데이터베이스 정보

### PostgreSQL (Neon Database)
- **제공업체:** Neon Database (서버리스)
- **연결 URL:** postgresql://neondb_owner:npg_0o2HTvrgDyiB@ep-bitter-frog-afe21mru.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
- **데이터베이스명:** neondb
- **총 테이블 수:** 25개

### 주요 테이블들
- `users` - 사용자 관리
- `ai_models`, `ai_model_folders` - AI 모델 관리
- `data_sources` - 외부 데이터 소스 연동
- `views` - 대시보드 및 뷰 관리
- `model_configurations` - AI 모델 설정
- 산업 데이터 테이블들 (wafer_data, process_parameters, etc.)

### 데이터베이스 복원 방법
1. VS Code에서 PostgreSQL 확장 설치
2. 데이터베이스 연결 설정 (위 정보 사용)
3. `database_backup.md` 파일의 CREATE TABLE 스크립트 실행
4. INSERT 스크립트로 기본 데이터 복원

---

## ⚙️ 4. Replit 특화 설정

### .replit 파일 내용
```toml
modules = ["nodejs-20", "web", "postgresql-16", "python-3.11", "python3"]
run = "npm run dev"
hidden = [".config", ".git", "generated-icon.png", "node_modules", "dist"]

[nix]
channel = "stable-24_05"
packages = ["glibcLocales", "libxcrypt"]

[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[[ports]]
localPort = 5000
externalPort = 80

[env]
PORT = "5000"

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Start application"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000
```

### VS Code에서 동등한 설정

1. **필수 확장 프로그램:**
   - TypeScript and JavaScript Language Features (내장)
   - ES6 modules syntax
   - PostgreSQL (ckolkman.vscode-postgres)
   - Python (ms-python.python)

2. **launch.json (디버깅용):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeArgs": ["-r", "tsx/cjs"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

3. **tasks.json (빌드 작업용):**
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "shell",
      "command": "npm run dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "build",
      "type": "shell",
      "command": "npm run build",
      "group": "build"
    }
  ]
}
```

---

## 🚀 5. VS Code에서 실행 명령어

### 초기 설정 (한 번만 실행)
```bash
# 1. 저장소 클론 또는 프로젝트 폴더 생성
mkdir dxt-enterprise-ai-fabric
cd dxt-enterprise-ai-fabric

# 2. Node.js 종속성 설치
npm install

# 3. Python 환경 설정 (선택사항, AI 모델 처리용)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 4. .env 파일 생성 (위 환경 변수 내용 입력)
touch .env

# 5. 데이터베이스 스키마 동기화
npm run db:push
```

### 개발 서버 실행
```bash
# 개발 모드 실행 (핫 리로드 포함)
npm run dev

# 또는 VS Code에서 F5 키로 디버깅 시작
```

### 빌드 및 프로덕션 실행
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

### 데이터베이스 관련 명령어
```bash
# 스키마 변경 사항 푸시
npm run db:push

# 타입 검사
npm run check

# 데이터베이스 연결 테스트 (psql 필요)
psql "postgresql://neondb_owner:npg_0o2HTvrgDyiB@ep-bitter-frog-afe21mru.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
```

---

## 🔧 6. 추가 설정 및 고려사항

### VS Code 설정 파일 (.vscode/settings.json)
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

### 포트 설정
- **개발 서버:** localhost:5000
- **Vite 개발 서버:** localhost:5173 (자동 프록시)
- **데이터베이스:** 5432 (Neon 클라우드)

### 문제 해결 가이드

1. **포트 충돌 시:**
   ```bash
   # 다른 포트 사용
   PORT=3000 npm run dev
   ```

2. **타입 에러 발생 시:**
   ```bash
   # 타입 검사 실행
   npm run check
   ```

3. **데이터베이스 연결 실패 시:**
   - .env 파일의 DATABASE_URL 확인
   - 네트워크 연결 상태 확인
   - Neon 데이터베이스 상태 확인

### 기능별 테스트 방법

1. **웹 애플리케이션:**
   - http://localhost:5000 접속
   - React 프론트엔드 정상 로드 확인

2. **AI 모델 업로드:**
   - AI Laboratory → Model Development 접속
   - 모델 파일 업로드 테스트

3. **데이터 소스 연동:**
   - Data Pipeline → Data Sources 접속
   - Google Sheets 연동 테스트

4. **API 엔드포인트:**
   ```bash
   # 헬스 체크
   curl http://localhost:5000/api/health
   
   # 데이터 소스 목록
   curl http://localhost:5000/api/data-sources
   ```

---

## ✅ 마이그레이션 체크리스트

- [ ] Node.js 20.x 설치 확인
- [ ] Python 3.11 설치 확인 (선택사항)
- [ ] npm install 실행
- [ ] .env 파일 생성 및 환경 변수 설정
- [ ] Google OAuth 설정
- [ ] Anthropic API 키 설정
- [ ] 데이터베이스 연결 테스트
- [ ] npm run dev 실행 테스트
- [ ] 웹 애플리케이션 접속 테스트
- [ ] VS Code 확장 프로그램 설치
- [ ] 디버깅 설정 구성
- [ ] 프로젝트 기능 테스트

이 가이드를 따라하시면 Replit에서 VS Code로 성공적으로 프로젝트를 이전하실 수 있습니다!