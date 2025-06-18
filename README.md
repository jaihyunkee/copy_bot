# 📋 CoPT (Copy  (G)PT)

**CoPT** is a full-stack web application that analyzes project files by uploading GitHub repositories or ZIP files, and merges selected files' code into a single text output.

## 🏗️ Project Architecture

```
copy_bot/
├── frontend/          # Next.js + React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/       # Next.js App Router
│   │   └── components/
│   └── package.json
├── backend/           # FastAPI + Python
│   └── app.py
├── requirements.txt   # Python dependencies
└── README.md
```

### 🔧 Tech Stack

**Frontend:**
- **Next.js 15.2.1** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **React Dropzone** - File drag & drop
- **Lucide React** - Icons

**Backend:**
- **FastAPI** - Modern Python web framework
- **Python 3.9+** - Backend language
- **Uvicorn** - ASGI server
- **CORS Middleware** - Cross-origin request support

## 🚀 Key Features

### 1. **Multiple Input Support**
- **GitHub Repository**: SSH/HTTPS URL support
  - `git@github.com:owner/repo.git`
  - `https://github.com/owner/repo.git`
- **ZIP File Upload**: Drag & drop or file selection

### 2. **Smart File Filtering**
- Auto-exclude hidden files/folders (starting with `.`)
- Auto-exclude cache folders
- File extension filtering
- Real-time file search

### 3. **Project Safety**
- **500MB Size Limit**: Prevents large project processing
- **Session-based Management**: Session isolation via UUID
- **Auto Cleanup**: Git metadata removal

### 4. **Code Merging & Export**
- Merge selected files into single text output
- File separators included (`[filename]` format)
- **Multi-encoding Support**: UTF-8, CP949 auto-detection
- One-click clipboard copy

### 5. **User-friendly UI**
- Responsive design
- File tree structure display
- Real-time loading states
- Selected files counter

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** 18.0.0 or higher
- **Python** 3.9 or higher
- **Git** (for GitHub clone functionality)
- **unzip** command (for ZIP file extraction)

### 1. Clone Project
```bash
git clone <repository-url>
cd copy_bot
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run backend server
cd backend
python app.py
# or
uvicorn app:app --host 127.0.0.1 --port 5000 --reload
```

### 3. Frontend Setup
```bash
# In new terminal
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 4. Access Application
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## 📚 API Documentation

### POST `/go`
Fetch and analyze project files.

**Request (Form Data):**
```
session_id: string (optional)
githubLink: string (optional)
file: File (ZIP file, optional)
```

**Response:**
```json
{
  "session_id": "uuid-string",
  "file_paths": ["src/app.py", "src/components/Button.tsx", ...]
}
```

### GET `/merge_codes`
Merge selected files' code.

**Query Parameters:**
```
session_id: string (required)
file_path: string[] (one or more required)
```

**Response:**
```
[src/app.py]
import os
import shutil
...

[src/components/Button.tsx]
import React from 'react'
...
```

## 🔄 Usage Guide

### 1. Import Project
- **GitHub**: Enter URL and click "Go" button
- **ZIP File**: Drag & drop or select file

### 2. Filter Files
- Use extension filters (`.js`, `.py`, `.tsx`, etc.)
- Search by filename

### 3. Select Files
- Click individual file checkboxes
- Use select all/deselect all buttons

### 4. Merge Code
- Click "Merge Selected Files" button
- Copy result to clipboard

## 🔒 Security Considerations

### ⚠️ Warnings
- **Arbitrary Code Execution Risk**: Security risks exist with Git clone and ZIP extraction
- **Session Data Management**: Session data in `user_clone/` folder is not auto-deleted

### 🛡️ Security Recommendations
- Configure sandbox environment for production
- Integrate virus scanning tools
- Implement regular temp folder cleanup scripts
- Review HTTPS usage and CORS settings

## 🔧 Development & Deployment

### Development Mode
```bash
# Backend (auto-reload)
uvicorn app:app --reload --host 127.0.0.1 --port 5000

# Frontend (hot reload)
npm run dev
```

### Production Build
```bash
# Frontend build
cd frontend
npm run build
npm start

# Backend production server
cd backend
uvicorn app:app --host 0.0.0.0 --port 5000
```

## 🧪 Testing

### API Test Examples
```bash
# Fetch GitHub repository
curl -X POST "http://localhost:5000/go" \
  -F "githubLink=https://github.com/user/repo.git"

# Merge files
curl "http://localhost:5000/merge_codes?session_id=SESSION_ID&file_path=src/app.py&file_path=README.md"
```

## 📈 Performance Optimization

- **File Size Limit**: 500MB limit for memory usage management
- **Selective File Loading**: Only user-selected files loaded into memory
- **Session-based Caching**: Cache utilization for repeated requests in same session
- **Streaming Response**: Stream large merge results

## 🤝 Contributing

### Development Environment Setup
1. Fork this repository
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### Bug Reports
- Report bugs through GitHub Issues
- Include reproducible steps and environment information

## 📄 License

This project is distributed under the MIT License. See the `LICENSE` file for details.

## 🙏 Acknowledgments

- **FastAPI**: Fast and modern web framework
- **Next.js**: Powerful React framework
- **Tailwind CSS**: Utility-first CSS framework
- **Open Source Community**: All libraries that made this project possible

---

💡 **Tip**: This tool can be used for various purposes such as code review, AI model training data preparation, and project analysis.
