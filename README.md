제작자 이메일 : canon9035@gmail.com


음성 파일을 업로드하면  
STT(Speech-to-Text) → 텍스트 변환 → 요약까지 자동으로 처리하는 서비스입니다.


## 🧩 아키텍처
[Frontend (React)] → [Backend (Spring Boot)]  → [STT Server (FastAPI + Whisper)]

### 통신 흐름

1. 사용자가 음성 파일 업로드
2. Backend가 작업(Job) 생성
3. STT Server에 전사 요청
4. STT Server가 chunk 단위로 음성 처리
5. 진행률을 Backend로 callback
6. Backend가 상태 저장
7. Frontend가 polling으로 진행률 조회
8. 완료 후 요약 결과 반환

---

## 🚀 주요 기능

- 🎤 음성 파일 업로드
- ✂️ 오디오 chunk 분할 처리 (대용량 대응)
- 🧠 Whisper 기반 음성 전사
- 📊 실시간 진행률 표시
- 📝 전사 결과 요약
- 🔄 비동기 작업 처리

---

## ⚙️ 기술 스택

### Backend
- Java 17
- Spring Boot
- Async 처리 (@Async)
- In-memory Job Store

### Frontend
- React
- Vite
- Polling 기반 진행률 UI

### STT Server
- Python
- FastAPI
- OpenAI Whisper
- ffmpeg (audio processing)

### Infra
- Docker
- Docker Compose

---

## 🐳 실행 방법 (Docker)

1. 환경 변수 설정

루트 `.env` 파일 생성

```env
OPENAI_API_KEY=your_api_key

2. 실행
docker compose up --build

3. 접속
Frontend: http://localhost:5173

Backend: http://localhost:8080

STT Server: http://localhost:8000


진행률 처리 방식
진행률은 단순 시간 기반이 아니라 실제 작업 기준으로 계산
0%   : 요청 생성
10%  : 업로드 완료
20%  : STT 시작
20~80% : chunk 전사 진행
90%  : 요약 생성
100% : 완료

핵심 구현
STT 서버 → Backend로 progress callback
Backend → 상태 저장
Frontend → polling

문제 해결 경험 (핵심 포인트)
1. Docker 환경에서 진행률 미반영 문제
문제
로컬에서는 정상
Docker에서는 10% → 100%로 점프

원인
localhost 사용으로 인해 컨테이너 간 통신 실패
# ❌ 잘못된 코드
SPRING_BASE_URL = "http://localhost:8080"
해결
Docker 내부 네트워크에서는 서비스명 사용
# ✅ 수정
SPRING_BASE_URL = "http://backend:8080"


2. Docker 빌드 성능 문제
문제
Gradle build를 Docker 내부에서 수행 → 매우 느림

해결
로컬에서 jar 빌드
Docker에서는 COPY만 수행

dockerfile
COPY build/libs/*.jar app.jar


3. ffmpeg 누락 문제
문제
ffprobe not found 에러 발생

해결
Dockerfile에 ffmpeg 설치 추가

dockerfile
RUN apt-get update && apt-get install -y ffmpeg

프로젝트 구조
audio-brief/
├─ backend/
├─ frontend/
├─ stt-server/
├─ docker-compose.yml
└─ README.md

개선 예정
Redis 기반 Job Store
WebSocket 기반 실시간 progress
AWS 배포 (ECS / ALB)
파일 저장소 분리 (S3)
인증 기능 추가


핵심 학습 포인트
Docker 컨테이너 간 네트워크 이해
비동기 작업 처리 구조 설계
대용량 파일 처리 전략 (chunking)
서비스 간 통신 설계
실시간 진행률 처리

