from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import tempfile
import os
import subprocess
import math
import traceback
import requests

app = FastAPI()

# 5분 단위 분할
CHUNK_SECONDS = 300

# Spring 백엔드 주소
SPRING_BASE_URL = "http://localhost:8080"


@app.get("/health")
def health():
    return {"status": "ok"}


def send_progress(job_id: str, progress: int, status: str | None = None):
    """
    Spring JobController로 진행률 전송
    실패해도 전사 자체는 계속 진행
    """
    try:
        requests.post(
            f"{SPRING_BASE_URL}/api/jobs/{job_id}/progress",
            json={
                "progress": progress,
                "status": status
            },
            timeout=1
        )
    except Exception:
        pass


def get_audio_duration(file_path: str) -> float:
    """
    ffprobe로 오디오 길이(초) 조회
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore"
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")

    return float(result.stdout.strip())


def split_audio(input_path: str, output_dir: str, chunk_seconds: int):
    """
    ffmpeg로 오디오를 chunk 단위로 분할
    """
    duration = get_audio_duration(input_path)
    chunk_count = math.ceil(duration / chunk_seconds)

    chunk_files = []

    for i in range(chunk_count):
        start = i * chunk_seconds
        chunk_path = os.path.join(output_dir, f"chunk_{i:03d}.mp3")

        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-ss", str(start),
            "-t", str(chunk_seconds),
            "-ac", "1",
            "-ar", "16000",
            chunk_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg split failed: {result.stderr}")

        chunk_files.append(chunk_path)

    return chunk_files


def transcribe_chunk(chunk_path: str, output_dir: str) -> str:
    """
    whisper CLI로 chunk 하나 전사
    """
    before_txt_files = {
        name for name in os.listdir(output_dir)
        if name.lower().endswith(".txt")
    }

    cmd = [
        "whisper",
        chunk_path,
        "--model", "tiny",
        "--language", "Korean",
        "--task", "transcribe",
        "--output_format", "txt",
        "--output_dir", output_dir,
        "--verbose", "False"
    ]

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        env=env
    )

    print("[WHISPER RETURN CODE]", result.returncode)
    print("[WHISPER STDOUT]")
    print(result.stdout)
    print("[WHISPER STDERR]")
    print(result.stderr)

    if result.returncode != 0:
        raise RuntimeError(f"whisper failed: {result.stderr}")

    after_txt_files = {
        name for name in os.listdir(output_dir)
        if name.lower().endswith(".txt")
    }

    new_txt_files = list(after_txt_files - before_txt_files)

    if not new_txt_files:
        print("[DEBUG] output_dir files:", os.listdir(output_dir))
        raise RuntimeError(f"txt not found in output dir: {output_dir}")

    new_txt_files.sort(
        key=lambda name: os.path.getmtime(os.path.join(output_dir, name)),
        reverse=True
    )

    txt_path = os.path.join(output_dir, new_txt_files[0])
    print(f"[INFO] found txt: {txt_path}")

    with open(txt_path, "r", encoding="utf-8") as f:
        return f.read()


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), jobId: str = Form(...)):
    temp_dir = None
    temp_audio_path = None

    try:
        suffix = os.path.splitext(file.filename)[1] or ".mp3"
        temp_dir = tempfile.mkdtemp()
        temp_audio_path = os.path.join(temp_dir, f"input{suffix}")

        with open(temp_audio_path, "wb") as f:
            content = await file.read()
            f.write(content)

        print(f"[INFO] saved file: {temp_audio_path}")
        print(f"[INFO] size: {os.path.getsize(temp_audio_path)} bytes")

        send_progress(jobId, 5, "TRANSCRIBING")

        chunk_files = split_audio(temp_audio_path, temp_dir, CHUNK_SECONDS)
        total_chunks = len(chunk_files)

        print(f"[INFO] chunk count: {total_chunks}")

        texts = []

        for idx, chunk_file in enumerate(chunk_files):
            # 10% ~ 80% 구간을 chunk 처리에 사용
            progress = int(((idx + 1) / total_chunks) * 70) + 10
            send_progress(jobId, progress, "TRANSCRIBING")

            print(f"[INFO] transcribing chunk {idx + 1}/{total_chunks}: {chunk_file}")
            text = transcribe_chunk(chunk_file, temp_dir)
            texts.append(text.strip())

        final_text = "\n".join(texts)

        # Python 전사 완료
        send_progress(jobId, 80, "TRANSCRIBING")

        return {"text": final_text}

    except Exception as e:
        print("===== TRANSCRIBE ERROR =====")
        traceback.print_exc()
        send_progress(jobId, 100, "FAILED")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        try:
            if temp_dir and os.path.exists(temp_dir):
                for name in os.listdir(temp_dir):
                    path = os.path.join(temp_dir, name)
                    if os.path.isfile(path):
                        os.remove(path)
                os.rmdir(temp_dir)
        except Exception:
            traceback.print_exc()