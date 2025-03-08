import os
import shutil
import subprocess
import uuid
import json
from flask import Flask, request, make_response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SESSION_MAP = {}  # { session_id: "/absolute/path/to/user_clone/<session_id>" }
MAX_FOLDER_SIZE = 500 * 1024 * 1024  # 500MB in bytes

def custom_jsonify(data, status=200):
    """
    Flask 기본 jsonify 대신, 한글을 이스케이프하지 않도록 ensure_ascii=False로 응답
    """
    resp = make_response(json.dumps(data, ensure_ascii=False), status)
    resp.headers['Content-Type'] = 'application/json; charset=utf-8'
    return resp

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

@app.route('/go', methods=['POST'])
def go():
    existing_session_id = request.form.get('session_id')

    base_clone_dir = os.path.join(os.getcwd(), "user_clone")
    os.makedirs(base_clone_dir, exist_ok=True)

    # 기존 세션 폴더가 있으면 삭제
    if existing_session_id and existing_session_id in SESSION_MAP:
        old_folder = SESSION_MAP.pop(existing_session_id, None)
        if old_folder and os.path.exists(old_folder):
            shutil.rmtree(old_folder, ignore_errors=True)
        session_id = existing_session_id
    else:
        # 새 세션
        session_id = str(uuid.uuid4())

    folder_path = os.path.join(base_clone_dir, session_id)
    os.makedirs(folder_path)

    try:
        github_link = request.form.get('githubLink')
        uploaded_file = request.files.get('file')

        if uploaded_file:
            # ZIP 파일 로직
            if not uploaded_file.filename.endswith('.zip'):
                shutil.rmtree(folder_path, ignore_errors=True)
                return custom_jsonify({"error": "파일 확장자가 .zip 이 아닙니다."}, 400)

            zip_path = os.path.join(folder_path, uploaded_file.filename)
            uploaded_file.save(zip_path)

            # subprocess.run을 통한 unzip
            try:
                subprocess.run(["unzip", zip_path, "-d", folder_path], check=True)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(folder_path, ignore_errors=True)
                return custom_jsonify({"error": f"unzip 명령어 실패: {e}"}, 400)
            except FileNotFoundError:
                # 시스템에 unzip 명령어가 없을 때 발생
                shutil.rmtree(folder_path, ignore_errors=True)
                return custom_jsonify({"error": "unzip 명령어를 찾을 수 없습니다. (시스템에 unzip이 설치되어 있는지 확인하세요)"}, 400)

        elif github_link:
            # GitHub repo 로직 (깊이 1로 클론)
            try:
                subprocess.run(["git", "clone", "--depth=1", github_link, folder_path], check=True)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(folder_path, ignore_errors=True)
                return custom_jsonify({"error": f"Git clone failed: {str(e)}"}, 400)

            # 클론 후 .git 폴더 제거
            git_folder = os.path.join(folder_path, ".git")
            if os.path.exists(git_folder):
                shutil.rmtree(git_folder, ignore_errors=True)
        else:
            shutil.rmtree(folder_path, ignore_errors=True)
            return custom_jsonify({"error": "githubLink 또는 file 둘 중 하나는 필수"}, 400)

        # 파일 목록과 폴더 크기 계산 (os.walk() 한 번만 실행)
        file_list, folder_size = list_files_and_get_size(folder_path)

        # 폴더 용량 체크
        if folder_size > MAX_FOLDER_SIZE:
            shutil.rmtree(folder_path, ignore_errors=True)
            return custom_jsonify({"error": "프로젝트 폴더가 500MB를 초과합니다."}, 400)

        # 숨김 파일 제외 후 실제 보여줄 파일이 없는 경우
        if not file_list:
            shutil.rmtree(folder_path, ignore_errors=True)
            return custom_jsonify({"error": "프로젝트에 숨김 파일 외에 표시할 파일이 없습니다."}, 400)

        # 세션 맵에 저장
        SESSION_MAP[session_id] = folder_path

        return custom_jsonify({
            "session_id": session_id,
            "file_paths": file_list
        }, 200)

    except Exception as e:
        shutil.rmtree(folder_path, ignore_errors=True)
        return custom_jsonify({"error": str(e)}, 500)

@app.route('/merge_codes', methods=['GET'])
def merge_codes():
    session_id = request.args.get('session_id')
    file_paths = request.args.getlist('file_path')

    if not session_id:
        return "session_id is required", 400
    if not file_paths:
        return "At least one file_path is required", 400

    folder_path = SESSION_MAP.get(session_id)
    if not folder_path or not os.path.exists(folder_path):
        return "Invalid or expired session_id", 400

    combined_text = ""
    for rel_path in file_paths:
        real_path = os.path.join(folder_path, rel_path)
        if not os.path.isfile(real_path):
            combined_text += f"[{rel_path}]\n파일이 존재하지 않습니다.\n\n"
            continue

        # UTF-8 시도 -> 실패 시 CP949 폴백
        try:
            with open(real_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(real_path, 'r', encoding='cp949') as f:
                content = f.read()

        filename = os.path.basename(real_path)
        combined_text += f"[{filename}]\n{content}\n\n"

    return combined_text, 200, {'Content-Type': 'text/plain; charset=utf-8'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)