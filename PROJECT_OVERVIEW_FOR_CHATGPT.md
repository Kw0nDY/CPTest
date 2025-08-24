# AI Model Workflow Platform - 프로젝트 개요

## 🎯 프로젝트 소개
AI 모델 구성 및 실행 플랫폼으로, 노드 기반 워크플로우 인터페이스를 통해 데이터 소스를 AI 모델에 연결하여 실행하고 결과를 시각화하는 시스템입니다.

## 🏗️ 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: Shadcn/ui (Radix UI 기반)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter

### Backend  
- **Runtime**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local uploads directory
- **AI Model Execution**: Python subprocess 호출

## 📁 프로젝트 구조

```
├── client/src/
│   ├── components/
│   │   ├── ai-models/         # AI 모델 관리 컴포넌트
│   │   ├── view/              # 대시보드 및 결과 시각화
│   │   ├── data-integration/  # 데이터 소스 연결
│   │   └── ui/                # Shadcn UI 컴포넌트
│   ├── pages/                 # 라우팅 페이지들
│   └── lib/                   # 유틸리티 및 설정
├── server/
│   ├── routes.ts              # API 엔드포인트 (5100+ 라인)
│   ├── storage.ts             # 데이터베이스 인터페이스
│   ├── modelExecutionService.ts # AI 모델 실행 엔진
│   ├── python_runner.py       # Python 모델 실행
│   └── stgcnRunner.py         # STGCN 모델 전용 실행기
├── shared/
│   └── schema.ts              # Drizzle ORM 스키마 정의
└── uploads/                   # 업로드된 모델 파일들
```

## 🚀 핵심 기능

### 1. 데이터 소스 연결
- **Google Sheets**: OAuth 2.0 인증, 실시간 데이터 동기화
- **Excel 파일**: 직접 업로드 및 파싱
- **Enterprise 시스템**: SAP, Oracle, Salesforce 연결 시뮬레이션
- **데이터 타입 자동 감지**: NUMBER, STRING, DATE 자동 변환

### 2. AI 모델 관리  
- **폴더 기반 조직화**: 색상/아이콘 커스터마이징
- **모델 파일 지원**: .pth, .pkl PyTorch/scikit-learn 모델
- **설정 파일 관리**: YAML/JSON 자동 생성 및 관리
- **메타데이터 분석**: 입출력 스펙 자동 추출

### 3. 워크플로우 에디터
- **노드 기반 인터페이스**: 드래그앤드롭으로 워크플로우 생성
- **노드 타입**:
  - 데이터 소스 노드 (Google Sheets, Excel 등)
  - AI 모델 노드 (업로드된 모델들) 
  - Final Goal 노드 (결과 수집)
- **연결선**: 데이터 플로우 시각화
- **실시간 유효성 검사**: 순환 참조 방지, 연결 검증

### 4. 모델 실행 엔진
- **레코드 기반 순차 처리**: 각 데이터 행별로 모델 실행
- **Python 서브프로세스**: PyTorch, scikit-learn 모델 실행
- **실시간 진행률**: 실행 상태 및 진행률 표시
- **에러 핸들링**: 상세한 에러 메시지 및 복구

### 5. 결과 시각화 (View Setting)
- **AI 결과를 데이터 소스로 자동 변환**
- **동적 대시보드 생성**
- **차트 타입**: Bar, Line, Pie, Scatter plots
- **실시간 새로고침**: 결과 데이터 실시간 업데이트

## 🔧 주요 API 엔드포인트

### AI 모델 관리
- `GET /api/ai-models` - 모델 목록 조회
- `POST /api/ai-models/:id/execute-batch` - 배치 실행
- `POST /api/ai-models/:id/execute-with-connections` - 워크플로우 실행

### 데이터 소스
- `GET /api/data-sources` - 데이터 소스 목록
- `POST /api/google-sheets/connect` - Google Sheets 연결
- `POST /api/excel/upload` - Excel 파일 업로드

### 워크플로우 
- `POST /api/model-configurations` - 워크플로우 저장
- `POST /api/model-configurations/:id/execute` - 워크플로우 실행

## 🎨 UI/UX 특징

### 디자인 시스템
- **네비게이션**: 3단계 계층 구조 사이드바
- **색상**: 파란색 그라데이션 테마
- **컴포넌트**: Shadcn/ui로 일관된 디자인
- **반응형**: Tailwind CSS 기반 모바일 대응

### 사용자 경험
- **직관적 워크플로우**: 드래그앤드롭으로 쉬운 연결
- **실시간 피드백**: 실행 상태, 에러 메시지, 진행률
- **다국어 지원**: 한국어 UI, 영어 기술 용어

## 🔍 데이터베이스 스키마 (주요 테이블)

```sql
-- AI 모델 정보
aiModels (id, name, filePath, inputSpecs, outputSpecs, folderId)

-- 데이터 소스
dataSources (id, name, type, config, dataSchema, sampleData) 

-- 모델 실행 결과
aiModelResults (id, modelId, inputData, results, status, executionTime)

-- 워크플로우 구성
modelConfigurations (id, name, nodes, connections, folderId)

-- 사용자 뷰 (대시보드)
views (id, name, config, assignments)
```

## 🐛 현재 알려진 이슈

1. **모델 파일 경로 문제**: 일부 모델에서 경로 중복 현상 (수정 진행 중)
2. **대용량 데이터 처리**: 메모리 최적화 필요
3. **에러 복구**: 실행 실패 후 재시작 로직 개선 필요

## 💡 개발 시 참고사항

### 코드 스타일
- **TypeScript**: 엄격한 타입 체크 활용
- **React Hooks**: 함수형 컴포넌트 중심
- **TanStack Query**: 서버 상태 관리 표준화
- **에러 핸들링**: try-catch 및 사용자 친화적 메시지

### 성능 최적화
- **청크 단위 처리**: 대용량 데이터 분할 처리  
- **캐싱**: 자주 사용되는 데이터 캐시
- **지연 로딩**: 컴포넌트 레이지 로딩

이 프로젝트는 기업급 AI 워크플로우 플랫폼으로 설계되어 확장성과 유지보수성을 고려하여 개발되었습니다.