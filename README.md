\# Audio Brief



음성 파일을 업로드하면 STT(Speech-to-Text) 처리 후 요약 결과를 제공하는 프로젝트입니다.



\## 프로젝트 구성



\- \*\*frontend\*\*: 사용자 업로드 및 진행 상태 확인용 UI

\- \*\*backend\*\*: 업로드, 작업 요청, 진행률 조회, 요약 API 제공

\- \*\*stt-server\*\*: 음성 파일 전사 처리 담당 Python 서버



\## 디렉터리 구조



```text

audio-brief/

├─ backend/

├─ frontend/

└─ stt-server/



기술 스택

Frontend

\-React

\-Vite

\-JavaScript

\-CSS

Backend

\-Java

\-Spring Boot

\-REST API

STT Server

\-Python

\-FastAPI 또는 Python API 서버 구조

\-음성 전사 처리 로직



주요 기능

\-음성 파일 업로드

\-STT 서버로 전사 요청

\-작업 진행률 조회

\-전사 결과 기반 요약

\-프론트엔드에서 상태 확인



서비스 흐름

1.사용자가 프론트엔드에서 음성 파일 업로드

2.백엔드가 업로드 파일을 수신하고 작업 생성

3.백엔드가 STT 서버에 전사 요청

4.STT 서버가 음성을 텍스트로 변환

5.백엔드가 전사 결과를 바탕으로 요약 생성

6.프론트엔드가 진행률 및 결과 표시



실행 방법

1\. STT 서버 실행

cd stt-server

python main.py

2\. 백엔드 실행

cd backend

./gradlew bootRun

Windows에서는:

gradlew.bat bootRun

3\. 프론트엔드 실행

cd frontend

npm install

npm run dev



환경 변수

백엔드에서는 OpenAI API Key를 환경 변수로 주입받도록 설정되어 있습니다.

openai.api.key=${OPENAI\_API\_KEY:}



예시:

Windows CMD

set OPENAI\_API\_KEY=your\_api\_key

PowerShell

$env:OPENAI\_API\_KEY="your\_api\_key"



향후 개선 방향

\-파일 저장소 분리

\-비동기 작업 큐 도입

\-사용자 인증 기능 추가

\-Docker Compose 기반 통합 실행

\-배포 자동화

\-예외 처리 및 재시도 정책 강화



프로젝트 목적

\-이 프로젝트는 음성 파일 처리, 비동기 작업 흐름, 외부 AI/STT 연동, 그리고 프론트엔드-백엔드-Python 서버 간 연계를 학습하고 구현하기 위한 사이드 프로젝트입니다.

