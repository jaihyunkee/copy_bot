import os
import shutil
import subprocess
import zipfile
import uuid
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SESSION_MAP = {}  # { session_id: "/path/to/user_clone/<session_id>" }
MAX_FOLDER_SIZE = 500 * 1024 * 1024  # 500MB in bytes

def parse_github_link(github_link: str):
    link = github_link.strip().rstrip('/').replace('.git', '')

    if link.startswith("git@github.com:"):
        part = link.replace("git@github.com:", "")
        if '/' in part:
            owner, repo = part.split('/', 1)
            if owner and repo:
                return owner, repo
        return None

    if "github.com" in link:
        parts = link.split('/')
        if len(parts) >= 5:
            owner = parts[-2]
            repo = parts[-1]
            if owner and repo:
                return owner, repo

    return None

def is_valid_github_repo(github_link: str) -> bool:
    parsed = parse_github_link(github_link)
    if not parsed:
        return False
    owner, repo = parsed
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        resp = requests.get(api_url, timeout=5)
        return resp.status_code == 200
    except:
        return False

def clone_github_repo(github_link, dest_folder):
    subprocess.run(["git", "clone", github_link, dest_folder], check=True)

def unzip_file(zip_file_path, dest_folder):
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(dest_folder)

def get_folder_size(folder_path: str) -> int:
    """
    folder_path 내부의 모든 파일 사이즈 합을 바이트 단위로 반환
    """
    total_size = 0
    for root, dirs, files in os.walk(folder_path):
        for f in files:
            fp = os.path.join(root, f)
            if os.path.isfile(fp):
                total_size += os.path.getsize(fp)
    return total_size

def list_all_files_in_folder(folder_path):
    file_list = []
    base_len = len(folder_path.rstrip(os.sep)) + 1

    for root, dirs, files in os.walk(folder_path):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if f.startswith("."):
                continue
            full_path = os.path.join(root, f)
            relative_path = full_path[base_len:]
            file_list.append(relative_path)

    return file_list

@app.route('/go', methods=['POST'])
def go():
    session_id = str(uuid.uuid4())

    base_clone_dir = os.path.join(os.getcwd(), "user_clone")
    os.makedirs(base_clone_dir, exist_ok=True)
    folder_path = os.path.join(base_clone_dir, session_id)
    os.makedirs(folder_path)

    try:
        github_link = request.form.get('githubLink')
        uploaded_file = request.files.get('file')

        if github_link:
            # 깃헙 유효성 체크
            if not is_valid_github_repo(github_link):
                shutil.rmtree(folder_path, ignore_errors=True)
                return jsonify({"error": "Invalid GitHub repository URL"}), 400

            # clone
            try:
                clone_github_repo(github_link, folder_path)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(folder_path, ignore_errors=True)
                return jsonify({"error": f"Git clone failed: {str(e)}"}), 400

        elif uploaded_file:
            if not uploaded_file.filename.endswith('.zip'):
                shutil.rmtree(folder_path, ignore_errors=True)
                return jsonify({"error": "파일 확장자가 .zip 이 아닙니다."}), 400

            zip_path = os.path.join(folder_path, uploaded_file.filename)
            uploaded_file.save(zip_path)

            try:
                unzip_file(zip_path, folder_path)
            except zipfile.BadZipFile:
                shutil.rmtree(folder_path, ignore_errors=True)
                return jsonify({"error": "유효하지 않은 ZIP 파일입니다."}), 400
        else:
            shutil.rmtree(folder_path, ignore_errors=True)
            return jsonify({"error": "githubLink 또는 file 둘 중 하나는 필수"}), 400

        # 폴더 용량 체크
        folder_size = get_folder_size(folder_path)
        if folder_size > MAX_FOLDER_SIZE:
            shutil.rmtree(folder_path, ignore_errors=True)
            return jsonify({"error": "프로젝트 폴더가 500MB를 초과합니다."}), 400

        file_list = list_all_files_in_folder(folder_path)
        if not file_list:
            shutil.rmtree(folder_path, ignore_errors=True)
            return jsonify({"error": "프로젝트에 숨김 파일 외에 표시할 파일이 없습니다."}), 400

        SESSION_MAP[session_id] = folder_path

        return jsonify({
            "session_id": session_id,
            "file_paths": file_list
        }), 200

    except Exception as e:
        shutil.rmtree(folder_path, ignore_errors=True)
        return jsonify({"error": str(e)}), 500

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

        try:
            with open(real_path, 'r', encoding='utf-8') as f:
                content = f.read()
            filename = os.path.basename(real_path)
            combined_text += f"[{filename}]\n{content}\n\n"
        except Exception as e:
            combined_text += f"[{rel_path}]\n에러: {str(e)}\n\n"

    return combined_text, 200, {'Content-Type': 'text/plain; charset=utf-8'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)