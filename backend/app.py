import os
import shutil
import subprocess
import uuid
import json

from fastapi import FastAPI, File, Form, UploadFile, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요 시 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSION_MAP = {}  # { session_id: "/absolute/path/to/user_clone/<session_id>" }
MAX_FOLDER_SIZE = 500 * 1024 * 1024  # 500MB in bytes

def list_files_and_get_size(folder_path: str):
    """
    한 번의 os.walk()를 통해,
    - 숨김 폴더/파일을 제외한 모든 파일의 상대 경로 리스트
    - 전체 폴더 사이즈(합계)를 반환합니다.
    """
    file_list = []
    total_size = 0
    base_len = len(folder_path.rstrip(os.sep)) + 1

    for root, dirs, files in os.walk(folder_path):
        # 숨김 폴더 제외
        dirs[:] = [d for d in dirs if not d.startswith(".")]

        for f in files:
            # 숨김 파일 제외
            if f.startswith("."):
                continue
            full_path = os.path.join(root, f)
            if os.path.isfile(full_path):
                total_size += os.path.getsize(full_path)

            relative_path = full_path[base_len:]
            file_list.append(relative_path)

    return file_list, total_size

@app.post("/go")
def go(
    session_id: Optional[str] = Form(None),
    githubLink: Optional[str] = Form(None),
    file: UploadFile = File(None)
):
    base_clone_dir = os.path.join(os.getcwd(), "user_clone")
    os.makedirs(base_clone_dir, exist_ok=True)

    # 기존 세션 폴더가 있으면 삭제
    if session_id and session_id in SESSION_MAP:
        old_folder = SESSION_MAP.pop(session_id, None)
        if old_folder and os.path.exists(old_folder):
            shutil.rmtree(old_folder, ignore_errors=True)
        current_session_id = session_id
    else:
        # 새 세션
        current_session_id = str(uuid.uuid4())

    folder_path = os.path.join(base_clone_dir, current_session_id)
    os.makedirs(folder_path)

    try:
        if file:
            # ZIP 파일 로직
            if not file.filename.endswith('.zip'):
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": "파일 확장자가 .zip 이 아닙니다."}, status_code=400)

            zip_path = os.path.join(folder_path, file.filename)
            with open(zip_path, "wb") as f_out:
                shutil.copyfileobj(file.file, f_out)

            # subprocess.run을 통한 unzip
            try:
                subprocess.run(["unzip", zip_path, "-d", folder_path], check=True)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": f"unzip 명령어 실패: {e}"}, status_code=400)
            except FileNotFoundError:
                # 시스템에 unzip 명령어가 없을 때 발생
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": "unzip 명령어를 찾을 수 없습니다. (시스템에 unzip이 설치되어 있는지 확인하세요)"}, status_code=400)

        elif githubLink:
            # GitHub repo 로직 (깊이 1로 클론)
            try:
                subprocess.run(["git", "clone", "--depth=1", githubLink, folder_path], check=True)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": f"Git clone failed: {str(e)}"}, status_code=400)

            # 클론 후 .git 폴더 제거
            git_folder = os.path.join(folder_path, ".git")
            if os.path.exists(git_folder):
                shutil.rmtree(git_folder, ignore_errors=True)
        else:
            shutil.rmtree(folder_path, ignore_errors=True)
            return JSONResponse({"error": "githubLink 또는 file 둘 중 하나는 필수"}, status_code=400)

        # 파일 목록과 폴더 크기 계산
        file_list, folder_size = list_files_and_get_size(folder_path)

        # 폴더 용량 체크
        if folder_size > MAX_FOLDER_SIZE:
            shutil.rmtree(folder_path, ignore_errors=True)
            return JSONResponse({"error": "프로젝트 폴더가 500MB를 초과합니다."}, status_code=400)

        # 숨김 파일 제외 후 실제 보여줄 파일이 없는 경우
        if not file_list:
            shutil.rmtree(folder_path, ignore_errors=True)
            return JSONResponse({"error": "프로젝트에 숨김 파일 외에 표시할 파일이 없습니다."}, status_code=400)

        # 세션 맵에 저장
        SESSION_MAP[current_session_id] = folder_path

        return JSONResponse({
            "session_id": current_session_id,
            "file_paths": file_list
        }, status_code=200)

    except Exception as e:
        shutil.rmtree(folder_path, ignore_errors=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/merge_codes", response_class=PlainTextResponse)
def merge_codes(
    session_id: str,
    file_path: List[str] = Query(None)
):
    """
    파일들을 순회하며, UTF-8로 먼저 읽고 실패하면 CP949로 재시도합니다.
    둘 다 실패할 경우, 어느 파일에서 깨졌는지 에러 메시지를 합쳐 반환합니다.
    """
    if not file_path:
        return PlainTextResponse("At least one file_path is required", status_code=400)

    folder_path = SESSION_MAP.get(session_id)
    if not folder_path or not os.path.exists(folder_path):
        return PlainTextResponse("Invalid or expired session_id", status_code=400)

    combined_text = ""
    for rel_path in file_path:
        real_path = os.path.join(folder_path, rel_path)
        filename = os.path.basename(real_path)

        if not os.path.isfile(real_path):
            combined_text += f"[{rel_path}]\n파일이 존재하지 않습니다.\n\n"
            continue

        content = None
        error_messages = []  # 인코딩 에러 메시지 추적

        # 1) UTF-8 시도
        try:
            with open(real_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError as e:
            error_messages.append(f"UTF-8 디코딩 실패: {str(e)}")

        # 2) CP949 재시도
        if content is None:
            try:
                with open(real_path, 'r', encoding='cp949') as f:
                    content = f.read()
            except UnicodeDecodeError as e:
                error_messages.append(f"CP949 디코딩 실패: {str(e)}")

        if content is None:
            # 두 인코딩 모두 실패 → 어느 파일인지 + 에러 내용 표시
            combined_text += (
                f"[{filename}]\n"
                f"인코딩 오류 발생 (UTF-8, CP949 모두 실패)\n"
                f"에러 상세: {error_messages}\n\n"
            )
        else:
            # 정상적으로 디코딩된 경우
            combined_text += f"[{filename}]\n{content}\n\n"

    return PlainTextResponse(content=combined_text, status_code=200)

# uvicorn으로 서버 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)