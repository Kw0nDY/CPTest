# Microsoft Excel OAuth 2.0 Integration Guide

## 개요

Microsoft Excel 연결 기능은 OAuth 2.0 토큰 기반 인증을 통해 사용자의 OneDrive 및 SharePoint Excel 파일에 실시간으로 접근할 수 있는 시스템입니다.

## 기술 아키텍처

### 1. OAuth 2.0 인증 플로우

```
[사용자] → [CP 시스템] → [Microsoft Identity Platform] → [Microsoft Graph API]
```

**인증 단계:**
1. 사용자가 Client ID 입력
2. Microsoft Authorization URL 생성
3. 팝업 창에서 Microsoft 로그인
4. Authorization Code 획득
5. Access Token 및 Refresh Token 교환
6. 토큰을 서버에 안전하게 저장

### 2. 실시간 데이터 접근

**API 엔드포인트:**
- `/api/microsoft-excel/status` - 연결 상태 확인
- `/api/microsoft-excel/files` - Excel 파일 목록 조회
- `/api/microsoft-excel/files/:fileId/data` - 워크시트 데이터 조회

**데이터 액세스 플로우:**
1. 저장된 Access Token으로 Microsoft Graph API 호출
2. OneDrive/SharePoint에서 Excel 파일 검색
3. 워크북 메타데이터 및 워크시트 목록 조회
4. 선택된 워크시트의 실제 데이터 읽기 (최대 100행)

## 실제 동작 방식

### Microsoft Graph API 활용

**파일 검색:**
```javascript
GET https://graph.microsoft.com/v1.0/me/drive/search(q='.xlsx OR .xls')
```

**워크시트 데이터 조회:**
```javascript
GET https://graph.microsoft.com/v1.0/me/drive/items/{fileId}/workbook/worksheets/{sheetId}/range(address='A1:Z100')
```

### 토큰 관리

**토큰 저장:**
- In-memory storage (개발용)
- 세션 기반 쿠키 관리
- 토큰 만료 시간 추적 및 자동 갱신

**보안 고려사항:**
- HttpOnly 쿠키로 토큰 보호
- HTTPS 강제 (프로덕션)
- 토큰 만료 시 자동 재인증

## 데이터 소스 연결 후 활용

### 1. 실시간 데이터 동기화

연결된 Excel 데이터 소스는 다음과 같이 활용됩니다:

**데이터 스키마 자동 생성:**
- 워크시트 컬럼 헤더를 기반으로 필드 정의
- 데이터 타입 자동 추론 (숫자, 텍스트, 날짜)
- 레코드 수 계산

**샘플 데이터 제공:**
- 각 워크시트별 첫 5-10행 미리보기
- View Setting에서 필드 매핑 시 활용
- 차트 및 테이블 구성 요소에서 실시간 데이터 표시

### 2. View Setting 통합

**데이터 필드 매핑:**
```javascript
// Excel 파일의 실제 필드가 View Setting에서 사용 가능
dataSource: "Microsoft Excel (Sales_Report.xlsx)"
table: "Sales Data"
fields: ["OrderID", "CustomerName", "TotalAmount", "OrderDate"]
```

**실시간 차트 생성:**
- Excel 데이터를 기반으로 한 동적 차트
- 데이터 변경 시 자동 업데이트
- 다양한 차트 타입 지원 (막대, 선, 파이 등)

### 3. 데이터 새로고침

**토큰 기반 실시간 동기화:**
- 사용자 권한 내에서 Excel 파일 데이터 실시간 조회
- View Setting에서 설정한 새로고침 주기에 따라 자동 업데이트
- OneDrive/SharePoint의 최신 버전 데이터 반영

## 설정 요구사항

### Microsoft Azure App Registration

1. **Azure Portal에서 앱 등록:**
   - Application Type: Web Application
   - Redirect URI: `http://localhost:3000/auth/microsoft/callback`

2. **API 권한 설정:**
   - `Files.Read` - 사용자 파일 읽기
   - `Sites.Read.All` - SharePoint 사이트 접근
   - `User.Read` - 사용자 프로필 읽기

3. **Client Secret 생성:**
   - 환경변수로 안전하게 관리
   - 만료 기간 설정 및 갱신 관리

### 환경변수 설정

```bash
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
```

## 사용자 워크플로우

### 1. 초기 연결

1. **Data Integration 탭에서 "Microsoft Excel" 선택**
2. **Client ID 입력** (Azure App Registration에서 획득)
3. **OAuth 인증** (Microsoft 계정으로 로그인)
4. **Excel 파일 선택** (OneDrive/SharePoint에서)
5. **데이터 소스 생성 완료**

### 2. View Setting에서 활용

1. **View Editor에서 데이터 탭 선택**
2. **Microsoft Excel 데이터 소스 선택**
3. **워크시트 및 필드 선택**
4. **차트/테이블 구성 요소에 매핑**
5. **실시간 데이터 미리보기 확인**

### 3. 대시보드에서 실시간 모니터링

1. **생성된 View에서 실시간 Excel 데이터 표시**
2. **설정된 새로고침 주기에 따라 자동 업데이트**
3. **Excel 파일 변경 시 대시보드 자동 반영**

## 장점 및 활용 사례

### 장점

- **실시간 연동:** Excel 파일 변경 시 즉시 반영
- **보안:** OAuth 2.0 기반 안전한 인증
- **편의성:** 파일 업로드 없이 클라우드 직접 연결
- **확장성:** 여러 Excel 파일 동시 연결 가능

### 활용 사례

1. **재무 보고서:** 실시간 매출 데이터 모니터링
2. **프로젝트 관리:** 진행 상황 실시간 추적
3. **인벤토리 관리:** 재고 수준 실시간 확인
4. **성과 분석:** KPI 대시보드 자동 업데이트

## 기술적 고려사항

### 성능 최적화

- **데이터 캐싱:** 빈번한 API 호출 방지
- **부분 로딩:** 필요한 범위만 조회
- **비동기 처리:** 대용량 파일 처리 시 UX 고려

### 에러 처리

- **토큰 만료:** 자동 재인증 플로우
- **네트워크 오류:** 재시도 로직
- **권한 부족:** 명확한 에러 메시지 제공

### 확장 가능성

- **SharePoint 연동:** 팀 공유 Excel 파일 접근
- **실시간 알림:** 데이터 변경 시 알림 기능
- **데이터 변환:** Excel 공식 및 포맷 지원

이러한 토큰 기반 Microsoft Excel 연동을 통해 사용자는 실제 업무에서 사용하는 Excel 파일을 CP 시스템과 실시간으로 연결하여 동적이고 실용적인 대시보드를 구축할 수 있습니다.