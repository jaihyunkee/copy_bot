# 📋 CoPT (Copy Project Tool)

**CoPT**는 GitHub 리포지토리 또는 ZIP 파일을 업로드하여 프로젝트 파일을 분석하고, 선택한 파일들의 코드를 하나의 텍스트로 병합해주는 풀스택 웹 애플리케이션입니다.

## 🏗️ 프로젝트 아키텍처

```
copy_bot/
├── frontend/          # Next.js + React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/       # Next.js App Router
│   │   └── components/
│   └── package.json
├── backend/           # FastAPI + Python
│   └── app.py
├── requirements.txt   # Python 의존성
└── README.md
```

### 🔧 기술 스택

**Frontend:**
- **Next.js 15.2.1** - React 프레임워크
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Tailwind CSS 4** - 스타일링
- **React Dropzone** - 파일 드래그 앤 드롭
- **Lucide React** - 아이콘

**Backend:**
- **FastAPI** - 현대적인 Python 웹 프레임워크
- **Python 3.9+** - 백엔드 언어
- **Uvicorn** - ASGI 서버
- **CORS 미들웨어** - 크로스 오리진 요청 지원

## 🚀 주요 기능

### 1. **다중 입력 지원**
- **GitHub 리포지토리**: SSH/HTTPS URL 지원
  - `git@github.com:owner/repo.git`
  - `https://github.com/owner/repo.git`
- **ZIP 파일 업로드**: 드래그 앤 드롭 또는 파일 선택

### 2. **스마트 파일 필터링**
- 숨김 파일/폴더 자동 제외 (`.` 시작)
- 캐시 폴더 자동 제외
- 파일 확장자별 필터링
- 실시간 파일 검색

### 3. **프로젝트 안전성**
- **500MB 크기 제한**: 대용량 프로젝트 방지
- **세션 기반 관리**: UUID를 통한 세션 격리
- **자동 임시 폴더 정리**: Git 메타데이터 제거

### 4. **코드 병합 및 내보내기**
- 선택한 파일들의 코드를 하나의 텍스트로 병합
- 파일별 구분자 포함 (`[filename]` 형식)
- **다중 인코딩 지원**: UTF-8, CP949 자동 감지
- 원클릭 클립보드 복사

### 5. **사용자 친화적 UI**
- 반응형 디자인
- 파일 트리 구조 표시
- 실시간 로딩 상태
- 선택된 파일 개수 표시

## 🛠️ 설치 및 실행

### 사전 요구사항
- **Node.js** 18.0.0 이상
- **Python** 3.9 이상
- **Git** (GitHub 클론 기능용)
- **unzip** 명령어 (ZIP 파일 해제용)

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd copy_bot
```

### 2. 백엔드 설정
```bash
# Python 의존성 설치
pip install -r requirements.txt

# 백엔드 서버 실행
cd backend
python app.py
# 또는
uvicorn app:app --host 127.0.0.1 --port 5000 --reload
```

### 3. 프론트엔드 설정
```bash
# 새 터미널에서
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 애플리케이션 접속
- 프론트엔드: `http://localhost:3000`
- 백엔드 API: `http://localhost:5000`

## 📚 API 문서

### POST `/go`
프로젝트 파일을 가져오고 분석합니다.

**요청 (Form Data):**
```
session_id: string (선택사항)
githubLink: string (선택사항)
file: File (ZIP 파일, 선택사항)
```

**응답:**
```json
{
  "session_id": "uuid-string",
  "file_paths": ["src/app.py", "src/components/Button.tsx", ...]
}
```

### GET `/merge_codes`
선택된 파일들의 코드를 병합합니다.

**쿼리 파라미터:**
```
session_id: string (필수)
file_path: string[] (하나 이상 필수)
```

**응답:**
```
[src/app.py]
import os
import shutil
...

[src/components/Button.tsx]
import React from 'react'
...
```

## 🔄 사용 방법

### 1. 프로젝트 가져오기
- **GitHub**: URL을 입력하고 "Go" 버튼 클릭
- **ZIP 파일**: 파일을 드래그 앤 드롭하거나 선택

### 2. 파일 필터링
- 확장자별 필터 사용 (`.js`, `.py`, `.tsx` 등)
- 파일 이름으로 검색

### 3. 파일 선택
- 개별 파일 체크박스 클릭
- 전체 선택/해제 버튼 사용

### 4. 코드 병합
- "Merge Selected Files" 버튼 클릭
- 결과를 클립보드에 복사

## 🔒 보안 고려사항

### ⚠️ 주의사항
- **임의 코드 실행 위험**: Git clone과 ZIP 압축 해제 시 보안 위험 존재
- **세션 데이터 관리**: `user_clone/` 폴더의 세션 데이터가 자동 삭제되지 않음

### 🛡️ 보안 권장사항
- 프로덕션 환경에서는 샌드박스 환경 구성
- 바이러스 스캔 도구 연동
- 정기적인 임시 폴더 정리 스크립트 구현
- HTTPS 사용 및 CORS 설정 검토

## 🔧 개발 및 배포

### 개발 모드
```bash
# 백엔드 (자동 재로드)
uvicorn app:app --reload --host 127.0.0.1 --port 5000

# 프론트엔드 (핫 리로드)
npm run dev
```

### 프로덕션 빌드
```bash
# 프론트엔드 빌드
cd frontend
npm run build
npm start

# 백엔드 프로덕션 서버
cd backend
uvicorn app:app --host 0.0.0.0 --port 5000
```

## 🧪 테스트

### API 테스트 예시
```bash
# GitHub 리포지토리 가져오기
curl -X POST "http://localhost:5000/go" \
  -F "githubLink=https://github.com/user/repo.git"

# 파일 병합
curl "http://localhost:5000/merge_codes?session_id=SESSION_ID&file_path=src/app.py&file_path=README.md"
```

## 📈 성능 최적화

- **파일 크기 제한**: 500MB로 제한하여 메모리 사용량 관리
- **선택적 파일 로딩**: 사용자가 선택한 파일만 메모리에 로드
- **세션 기반 캐싱**: 동일 세션에서 반복 요청 시 캐시 활용
- **스트리밍 응답**: 대용량 병합 결과를 스트리밍으로 전송

## 🤝 기여하기

### 개발 환경 설정
1. 이 리포지토리를 포크합니다
2. 새 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

### 버그 리포트
- GitHub Issues를 통해 버그를 신고해주세요
- 재현 가능한 단계와 환경 정보를 포함해주세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사의 말

- **FastAPI**: 빠르고 현대적인 웹 프레임워크
- **Next.js**: 강력한 React 프레임워크
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **오픈소스 커뮤니티**: 이 프로젝트를 가능하게 해준 모든 라이브러리들

---

💡 **팁**: 이 도구는 코드 리뷰, AI 모델 훈련 데이터 준비, 프로젝트 분석 등 다양한 용도로 활용할 수 있습니다.
