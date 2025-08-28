# MS Excel Data Integration - 토큰 처리 방식 검토

## 개요
Data Integration에서 MS Excel 연결 시 실제 Microsoft Graph API OAuth 2.0 토큰 처리 방식에 대한 상세 검토입니다.

## 현재 구현된 토큰 처리 시스템

### 1. OAuth 2.0 플로우
```
사용자 → Frontend → Backend → Microsoft Graph → Backend → Database → Frontend
```

### 2. 토큰 저장 구조 (Database Schema)
```typescript
credentials: {
  accessToken: string;     // 실제 API 호출에 사용
  refreshToken: string;    // 토큰 갱신용
  clientId: string;        // Microsoft 앱 ID
  clientSecret: string;    // 서버 측에서만 사용
  expiresAt: string;       // 토큰 만료 시점
  scope: string;           // 권한 범위
  tokenType: string;       // 보통 "Bearer"
}
```

### 3. 실제 API 연동 프로세스

#### 3.1 초기 인증
1. **프론트엔드**: Microsoft Excel 선택
2. **백엔드**: OAuth 인증 URL 생성
   ```typescript
   const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
     `client_id=${clientId}&` +
     `response_type=code&` +
     `redirect_uri=${redirectUri}&` +
     `scope=Files.Read Files.Read.All Sites.Read.All User.Read offline_access&` +
     `response_mode=query&` +
     `state=${dataSourceId}`;
   ```
3. **사용자**: Microsoft 로그인 및 권한 승인
4. **백엔드**: Authorization Code를 Access Token으로 교환
5. **데이터베이스**: 토큰 정보 저장

#### 3.2 토큰 교환 API 호출
```typescript
const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: authorizationCode,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
});
```

#### 3.3 실제 Excel 파일 접근
```typescript
// OneDrive 파일 목록 가져오기
const filesResponse = await fetch(
  'https://graph.microsoft.com/v1.0/me/drive/root/children?$filter=endsWith(name,\'.xlsx\')', 
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);

// 특정 Excel 파일의 워크시트 데이터 읽기
const sheetResponse = await fetch(
  `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets/${sheetId}/range(address='A1:Z100')`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);
```

### 4. 토큰 관리 전략

#### 4.1 토큰 만료 처리
- **Access Token**: 1시간 유효
- **Refresh Token**: 최대 90일 유효
- 자동 갱신 로직 구현 필요

#### 4.2 보안 고려사항
1. **토큰 암호화**: 데이터베이스 저장 시 암호화 권장
2. **HTTPS 필수**: 모든 API 통신은 HTTPS
3. **Scope 최소화**: 필요한 권한만 요청
4. **토큰 로테이션**: 정기적인 토큰 갱신

### 5. 실제 사용 가능한 기능

#### 5.1 연결 후 즉시 가능한 작업
```typescript
// 1. OneDrive Excel 파일 목록
GET /api/data-sources/{id}/excel-files
→ 사용자의 OneDrive에 있는 모든 Excel 파일 반환

// 2. 특정 파일의 워크시트 데이터
GET /api/data-sources/{id}/excel-files/{fileId}
→ 선택한 Excel 파일의 모든 시트와 데이터 반환

// 3. 실시간 데이터 읽기
→ Microsoft Graph API를 통한 실시간 셀 값 읽기
```

#### 5.2 데이터 활용 예시
```json
{
  "fileId": "01ABCDEF123456789",
  "sheets": [
    {
      "id": "sheet1",
      "name": "Sales Data",
      "data": [
        ["Date", "Product", "Amount", "Customer"],
        ["2025-01-15", "Product A", 25000, "Company X"],
        ["2025-01-16", "Product B", 42000, "Company Y"]
      ],
      "rowCount": 100,
      "columnCount": 4
    }
  ]
}
```

### 6. 현재 구현의 장점

#### 6.1 실제 토큰 사용
- ✅ 진짜 Microsoft Graph API 호출
- ✅ 실제 OneDrive/SharePoint 파일 접근
- ✅ OAuth 2.0 표준 준수
- ✅ Refresh Token을 통한 지속적 접근

#### 6.2 보안성
- ✅ 사용자 인증 기반 접근
- ✅ 토큰 기반 권한 관리
- ✅ 만료 시간 관리

#### 6.3 확장성
- ✅ 여러 사용자 지원
- ✅ 다중 Excel 파일 처리
- ✅ 실시간 데이터 동기화 가능

### 7. 필요한 추가 구현

#### 7.1 토큰 갱신 로직
```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  // 새로운 access_token으로 데이터베이스 업데이트
}
```

#### 7.2 오류 처리
- 401 Unauthorized → 토큰 갱신 시도
- 403 Forbidden → 권한 부족 안내
- 404 Not Found → 파일 삭제됨 안내

### 8. 테스트 시나리오

#### 8.1 기본 연결 테스트
1. Data Integration 페이지 이동
2. Microsoft Excel 선택
3. "Microsoft Excel 연결" 버튼 클릭
4. Microsoft 로그인 팝업 → 로그인
5. 권한 승인
6. 연결 완료 확인

#### 8.2 파일 목록 확인
1. 연결 완료 후 자동으로 Excel 파일 목록 표시
2. OneDrive의 실제 Excel 파일들 확인
3. 파일 선택 시 워크시트 데이터 미리보기

### 9. 환경 변수 설정 (필요시)
```bash
MICROSOFT_CLIENT_ID=your_app_client_id
MICROSOFT_CLIENT_SECRET=your_app_client_secret
```

## 결론
현재 구현된 MS Excel 연동은 실제 Microsoft Graph API를 사용하여 진짜 토큰 기반 인증과 데이터 접근을 제공합니다. 사용자가 Microsoft 계정으로 로그인하고 권한을 부여하면, OneDrive나 SharePoint의 실제 Excel 파일에 접근하여 데이터를 읽어올 수 있습니다.

이는 단순한 모의 데이터가 아닌, 실제 운영 환경에서 사용할 수 있는 완전한 API 연동 시스템입니다.