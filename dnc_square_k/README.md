# 던전앤코파일럿 광장 설정 가이드

이 웹 애플리케이션을 사용하기 위해서는 Azure Blob Storage 설정이 필요합니다.

## Azure Blob Storage 설정 방법

### 1. Azure Storage Account 생성
1. Azure Portal(https://portal.azure.com)에 로그인합니다
2. "Storage accounts"를 검색하여 선택합니다
3. "+ Create" 버튼을 클릭합니다
4. 필요한 정보를 입력하고 Storage Account를 생성합니다

### 2. Container 생성
다음 4개의 Container를 생성해야 합니다:
- `images` - 이미지 업로드용
- `documents` - 문서 업로드용
- `votes` - 투표 데이터 저장용
- `worldcup` - 월드컵용 이미지

각 Container를 생성하는 방법:
1. Storage Account로 이동합니다
2. 왼쪽 메뉴에서 "Containers"를 선택합니다
3. "+ Container" 버튼을 클릭합니다
4. Container 이름을 입력하고 생성합니다

### 3. SAS Token 생성
1. Storage Account로 이동합니다
2. 왼쪽 메뉴에서 "Shared access signature"를 선택합니다
3. 다음 권한을 선택합니다:
   - Allowed services: Blob
   - Allowed resource types: Container, Object
   - Allowed permissions: Read, Write, List, Create
4. 만료 날짜를 적절히 설정합니다
5. "Generate SAS and connection string" 버튼을 클릭합니다
6. "SAS token" 값을 복사합니다 (sv=로 시작하는 문자열)

### 4. config.js 파일 수정
`config.js` 파일을 열어 다음 값을 수정합니다:

```javascript
const AZURE_CONFIG = {
    accountName: 'your-storage-account-name',  // Storage Account 이름으로 변경
    sasToken: 'your-sas-token',                // 복사한 SAS Token으로 변경
    // ...
};
```

## 사용 방법

1. `index.html` 파일을 웹 브라우저로 엽니다
2. 왼쪽 메뉴에서 원하는 기능을 선택합니다:
   - **이미지 업로드**: 이미지 파일을 Azure Blob Storage에 업로드 (이메일 입력 필수)
   - **문서 업로드**: 문서 파일을 Azure Blob Storage에 업로드 (이메일 입력 필수)
   - **갤러리**: 업로드된 이미지를 갤러리 형태로 보기 (업로더 이메일 표시)
   - **파일 목록**: 업로드된 모든 파일을 목록으로 보기
   - **이미지 투표**: 이미지에 투표하고 결과 확인 (브라우저 기반 중복 방지)
   - **이미지 월드컵**: 토너먼트 방식의 이미지 선택 게임

### URL 파라미터로 특정 카테고리 바로 열기

URL 뒤에 `?category=카테고리ID` 파라미터를 추가하면 해당 카테고리로 바로 이동합니다:

```
index.html?category=gallery        # 갤러리로 바로 이동
index.html?category=voting         # 투표로 바로 이동
index.html?category=worldcup       # 월드컵으로 바로 이동
index.html?category=upload-images  # 이미지 업로드로 바로 이동
```

사용 가능한 카테고리 ID:
- `upload-images` - 이미지 업로드
- `upload-docs` - 문서 업로드
- `gallery` - 갤러리
- `file-list` - 파일 목록
- `voting` - 이미지 투표
- `worldcup` - 이미지 월드컵

## 주의사항

- 이 애플리케이션은 서버 없이 클라이언트 사이드에서만 동작합니다
- SAS Token은 공개되면 안 되므로 주의해서 관리하세요
- 프로덕션 환경에서는 백엔드 서버를 통해 SAS Token을 관리하는 것을 권장합니다
- CORS 설정이 필요할 수 있습니다 (Storage Account > Settings > CORS)

## CORS 설정 방법

브라우저에서 직접 Azure Blob Storage에 접근하려면 CORS 설정이 필요합니다:

1. Storage Account로 이동합니다
2. 왼쪽 메뉴에서 "Resource sharing (CORS)"를 선택합니다
3. Blob service 탭에서 다음과 같이 설정합니다:
   - Allowed origins: * (또는 특정 도메인)
   - Allowed methods: GET, PUT, POST, DELETE, HEAD, OPTIONS
   - Allowed headers: *
   - Exposed headers: *
   - Max age: 3600

## 파일 구조

```
├── index.html       # 메인 HTML 파일
├── config.js        # Azure 설정 및 카테고리 정의
├── storage.js       # Azure Blob Storage 작업 모듈
├── app.js           # 메인 애플리케이션 로직
├── styles.css       # 스타일시트
└── README.md        # 이 파일
```

## 기능 추가/수정

새로운 카테고리를 추가하려면 `config.js` 파일의 `CATEGORIES` 배열에 새 항목을 추가하세요:

```javascript
{
    id: 'my-category',           // 고유 ID
    name: '내 카테고리',          // 표시될 이름
    type: 'upload',              // 타입: upload, gallery, filelist, voting, worldcup
    container: 'my-container',   // Azure Container 이름
    icon: '🎯'                   // 아이콘 이모지
}
```
