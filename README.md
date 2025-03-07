
## 📌 CoPyT

A simple Flask backend that** ****clones** or** ****unzips** a project,** ****lists files**, and** ****merges code** as text.

---

### 🚀 Key Features

1. **GitHub Link Support**
   * Accepts SSH/HTTPS GitHub links (e.g.** **`<span>git@github.com:owner/repo.git</span>`,** **`<span>https://github.com/owner/repo.git</span>`).
   * Checks validity via GitHub API, then clones if valid.
2. **ZIP File Upload**
   * Upload a** **`<span>.zip</span>` file, and the backend will unzip and analyze its contents.
3. **Size Limit**
   * If the extracted/clone folder exceeds** ****500MB**, it returns an error.
4. **Hidden Files Exclusion**
   * Files/folders starting with a dot (`<span>.</span>`) are excluded from the file list.
5. **Code Merging**
   * Merge multiple selected files into a single text output with** **`<span>[filename]\n<content>\n\n</span>` format.

---

### 🛠️ How to Run

1. **Install Dependencies**

```
pip install flask flask-cors requests
```

### Run the Server

```
python app.py
```

* Starts Flask on** **`<span>localhost:5000</span>` (default).
* Alternatively, configure the port and debugging in** **`<span>app.run(...)</span>`.

### Test the Endpoints

* **POST** `<span>/go</span>` → FormData:** **`<span>githubLink</span>` (string) or file (ZIP)
* **GET** `<span>/merge_codes</span>` → Query params:** **`<span>session_id</span>`,** **`<span>file_path</span>` (one or more)

---

⚠️** ****Warnings**

* **Security**:
  * Arbitrary Git clone or ZIP extraction can pose security risks.
  * Consider sandboxing, authentication, or virus scanning as needed.
* **Session Folder Cleanup**:
  * The project folders remain after usage (`<span>user_clone/<session_id></span>`).
  * In production, implement an auto-cleanup or manual deletion process.

---

🩹** ****License & Contribution**

* **License**: Feel free to use and redistribute under your preferred license (MIT, etc.).
* **Contributions**:
  * Pull Requests, Issues, and feature requests are welcome!
  * Submit your suggestions or improvements to help grow this project.
