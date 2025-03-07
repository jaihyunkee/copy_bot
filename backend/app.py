import os
import shutil
import tempfile
import uuid
import subprocess
import zipfile
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# session_id -> folder_path 매핑을 임시로 메모리에 저장
# 실제 서비스라면 DB나 캐시에 저장할 수도 있음
SESSION_MAP = {}  # 예: { "some-uuid": "/tmp/xxxx" }


def clone_github_repo(github_link, dest_folder):
    """
    GitHub 리포지토리를 clone하는 헬퍼 함수
    """
    subprocess.run(["git", "clone", github_link, dest_folder], check=True)


def unzip_file(zip_file_path, dest_folder):
    """
    ZIP 파일을 해제하는 헬퍼 함수
    """
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(dest_folder)


@app.route('/api/upload', methods=['POST'])
def upload():
    """
    1) 깃헙 링크 또는 zip 파일을 받아서,
       서버 임시 폴더에 저장하고,
       session_id를 생성해 반환.

    요청 form-data 예시:
      - 'githubLink': (optional) 깃헙 URL
      - 'file': (optional) ZIP 파일

    응답 JSON 예시:
      {
        "session_id": "123e4567-e89b-12d3-a456-426614174000"
      }
    """
    tmp_dir = tempfile.mkdtemp()
    session_id = str(uuid.uuid4())

    try:
        github_link = request.form.get('githubLink')
        uploaded_file = request.files.get('file')

        if github_link:
            # GitHub clone
            try:
                clone_github_repo(github_link, tmp_dir)
            except subprocess.CalledProcessError as e:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                return jsonify({"error": f"Git clone failed: {str(e)}"}), 400

        elif uploaded_file:
            # ZIP 파일 업로드 처리
            if not uploaded_file.filename.endswith('.zip'):
                shutil.rmtree(tmp_dir, ignore_errors=True)
                return jsonify({"error": "파일 확장자가 .zip 이 아닙니다."}), 400

            zip_path = os.path.join(tmp_dir, uploaded_file.filename)
            uploaded_file.save(zip_path)

            try:
                unzip_file(zip_path, tmp_dir)
            except zipfile.BadZipFile:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                return jsonify({"error": "유효하지 않은 ZIP 파일입니다."}), 400
        else:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return jsonify({"error": "githubLink 또는 file 둘 중 하나는 필수입니다."}), 400

        # 세션 맵에 저장
        SESSION_MAP[session_id] = tmp_dir

        return jsonify({"session_id": session_id})

    except Exception as e:
        # 예상치 못한 에러 처리
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return jsonify({"error": str(e)}), 500


@app.route('/api/extensions', methods=['GET'])
def get_unique_extensions():
    """
    2) session_id를 받아 해당 폴더를 순회하고,
       유니크한 확장자와 해당 확장자를 가진 파일 목록을 반환.

    요청 쿼리: ?session_id=<session_id>
    응답 JSON 예시:
      {
        "extensions": {
          ".py": ["main.py", "utils.py"],
          ".md": ["README.md"]
        }
      }
    """
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    folder_path = SESSION_MAP.get(session_id)
    if not folder_path or not os.path.exists(folder_path):
        return jsonify({"error": "Invalid or expired session_id"}), 400

    ext_map = {}  # 예: { ".py": ["main.py", "utils.py"], ... }

    for root, dirs, files in os.walk(folder_path):
        for f in files:
            _, ext = os.path.splitext(f)
            if ext:
                ext_map.setdefault(ext, []).append(f)

    return jsonify({"extensions": ext_map})


@app.route('/api/merge-files', methods=['POST'])
def merge_files():
    """
    3) session_id와 사용자가 선택한 파일 목록(files)을 받아,
       해당 파일들을 합쳐서 텍스트로 반환.

    요청 body(JSON):
      {
        "session_id": "some-uuid",
        "files": ["main.py", "utils.py", ...]
      }

    응답: text/plain 형태로 합친 파일 내용
    """
    data = request.get_json()
    session_id = data.get('session_id')
    files = data.get('files', [])

    if not session_id or not files:
        return jsonify({"error": "session_id와 files가 필요합니다."}), 400

    folder_path = SESSION_MAP.get(session_id)
    if not folder_path or not os.path.exists(folder_path):
        return jsonify({"error": "Invalid or expired session_id"}), 400

    combined_text = ""
    for filename in files:
        file_path = os.path.join(folder_path, filename)
        # 파일이 여러 하위폴더에 있을 수 있다면, 좀 더 복잡한 탐색 로직 필요.
        # 여기서는 단순히 "최상위 폴더"라는 가정으로 작성.
        # 혹은 files 배열이 "subdir/filename.py" 식으로 온다고 가정.

        # 파일 찾기 (재귀적으로 검색) 방식을 쓰고 싶다면:
        # for root, dirs, fs in os.walk(folder_path):
        #     if filename in fs:
        #         file_path = os.path.join(root, filename)
        #         break
        # ... 이런 식 구현 가능

        if not os.path.isfile(file_path):
            combined_text += f"[{filename}]\n파일이 존재하지 않습니다.\n\n"
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            combined_text += f"[{filename}]\n{content}\n\n"
        except Exception as e:
            combined_text += f"[{filename}]\n에러: {str(e)}\n\n"

    return combined_text, 200, {'Content-Type': 'text/plain; charset=utf-8'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)