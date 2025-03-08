import os
import shutil
import subprocess
import uuid

from fastapi import FastAPI, File, Form, UploadFile, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요 시 특정 도메인(https://example.com)으로 제한 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 세션ID -> 폴더 경로
SESSION_MAP = {}  # { session_id: "/absolute/path/to/user_clone/<session_id>" }

# 500MB
MAX_FOLDER_SIZE = 500 * 1024 * 1024

def list_files_and_get_size(folder_path: str):
    """
    한 번의 os.walk()를 통해,
    - 숨김 폴더/파일 & 이름에 'cache'를 포함한 폴더 제외
    - 전체 파일 목록과 폴더 사이즈를 구해서 반환
    """
    file_list = []
    total_size = 0
    base_len = len(folder_path.rstrip(os.sep)) + 1

    for root, dirs, files in os.walk(folder_path):
        # 폴더 필터링
        dirs[:] = [
            d for d in dirs
            if not d.startswith(".") and "cache" not in d.lower()
        ]
        # 파일 필터링 & 사이즈 계산
        for f in files:
            if f.startswith("."):
                continue  # 숨김 파일 패스
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
    """
    - session_id가 비어있으면 새로 생성
    - 이미 존재하는 session_id면 해당 폴더 재사용(새로 업로드 시 폴더 비우고 교체)
    - if githubLink: github clone --depth=1
      elif file: unzip
      else: 에러
    - 숨김/캐시 폴더 제외, 500MB 초과 시 에러
    """
    base_clone_dir = os.path.join(os.getcwd(), "user_clone")
    os.makedirs(base_clone_dir, exist_ok=True)

    # 1) 세션 ID 결정
    if session_id and session_id.strip():
        current_session_id = session_id.strip()
    else:
        current_session_id = str(uuid.uuid4())

    # 2) 기존 세션 폴더 재사용 (이 예시에서는 새 업로드 시 삭제 후 생성)
    if current_session_id in SESSION_MAP:
        folder_path = SESSION_MAP[current_session_id]
        shutil.rmtree(folder_path, ignore_errors=True)
        os.makedirs(folder_path, exist_ok=True)
    else:
        folder_path = os.path.join(base_clone_dir, current_session_id)
        os.makedirs(folder_path, exist_ok=True)
        SESSION_MAP[current_session_id] = folder_path

    try:
        # 깃헙 링크가 우선
        if githubLink:
            try:
                subprocess.run(["git", "clone", "--depth=1", githubLink, folder_path], check=True)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": f"Git clone failed: {str(e)}"}, status_code=400)
            except FileNotFoundError:
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": "git이 설치되어 있지 않거나 환경 문제로 'git' 명령어를 찾을 수 없습니다."}, status_code=400)

            # .git 폴더 제거
            git_folder = os.path.join(folder_path, ".git")
            if os.path.exists(git_folder):
                shutil.rmtree(git_folder, ignore_errors=True)

        # 깃헙 링크가 없으면 ZIP 처리
        elif file:
            if not file.filename.endswith('.zip'):
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": "파일 확장자가 .zip 이 아닙니다."}, status_code=400)

            zip_path = os.path.join(folder_path, file.filename)
            with open(zip_path, "wb") as f_out:
                shutil.copyfileobj(file.file, f_out)

            try:
                # unzip 설치 필요
                subprocess.run(["unzip", zip_path, "-d", folder_path], check=True)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": f"unzip 명령어 실패: {e}"}, status_code=400)
            except FileNotFoundError:
                shutil.rmtree(folder_path, ignore_errors=True)
                return JSONResponse({"error": "'unzip' 명령어를 찾을 수 없습니다. (시스템에 unzip 설치 확인)"}, status_code=400)

        # 둘 다 없으면 에러
        else:
            shutil.rmtree(folder_path, ignore_errors=True)
            return JSONResponse({"error": "githubLink 또는 file 둘 중 하나는 필수입니다."}, status_code=400)

        # 파일 목록 & 폴더 크기
        file_list, folder_size = list_files_and_get_size(folder_path)

        # 500MB 초과 시 에러
        if folder_size > MAX_FOLDER_SIZE:
            shutil.rmtree(folder_path, ignore_errors=True)
            return JSONResponse({"error": "프로젝트 폴더가 500MB를 초과합니다."}, status_code=400)

        # 숨김/캐시 폴더 제외 후 파일이 없다면 에러
        if not file_list:
            shutil.rmtree(folder_path, ignore_errors=True)
            return JSONResponse({"error": "프로젝트에 숨김 파일 외에 표시할 파일이 없습니다."}, status_code=400)

        # 성공 응답: session_id + 파일목록
        return JSONResponse({
            "session_id": current_session_id,
            "file_paths": file_list
        }, status_code=200)

    except Exception as e:
        # 알 수 없는 예외 발생 시 폴더 삭제
        shutil.rmtree(folder_path, ignore_errors=True)
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/merge_codes", response_class=PlainTextResponse)
def merge_codes(
    session_id: str,
    file_path: List[str] = Query(None)
):
    """
    session_id로 폴더를 찾은 뒤, file_path 목록을 순회하여
    - UTF-8로 읽기 시도, 실패 시 CP949 재시도
    - 둘 다 실패하면 해당 파일 인코딩 오류 메시지
    - 성공한 파일들은 [파일명] + 본문 형식으로 합쳐서 반환
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
        error_messages = []

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
            # 둘 다 실패
            combined_text += (
                f"[{filename}]\n"
                f"인코딩 오류 발생 (UTF-8, CP949 모두 실패)\n"
                f"에러 상세: {error_messages}\n\n"
            )
        else:
            # 성공적으로 읽음
            combined_text += f"[{filename}]\n{content}\n\n"

    return PlainTextResponse(content=combined_text, status_code=200)


# uvicorn 실행 예시
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)