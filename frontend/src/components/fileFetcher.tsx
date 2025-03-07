import React, { useState, useEffect } from 'react'

interface FileFetcherProps {
  githubLink: string
  setGithubLink: (link: string) => void
}

const FileFetcher: React.FC<FileFetcherProps> = ({
  githubLink,
  setGithubLink,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [showFiles, setShowFiles] = useState(false)
  const [extensions, setExtensions] = useState<string[]>([])
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([])
  const [filteredFiles, setFilteredFiles] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // 파일 목록이 업데이트되면 확장자 목록 추출
  useEffect(() => {
    if (files.length > 0) {
      const exts = files
        .map(file => {
          const parts = file.split('.')
          return parts.length > 1 ? `.${parts[parts.length - 1]}` : null
        })
        .filter((ext): ext is string => ext !== null)
      const uniqueExts = Array.from(new Set(exts)).sort()
      setExtensions(uniqueExts)
    }
  }, [files])

  // 선택한 확장자에 따라 파일 필터링
  useEffect(() => {
    if (selectedExtensions.length === 0) {
      setFilteredFiles(files)
    } else {
      const filtered = files.filter(file => {
        const parts = file.split('.')
        if (parts.length > 1) {
          const ext = `.${parts[parts.length - 1]}`
          return selectedExtensions.includes(ext)
        }
        return false
      })
      setFilteredFiles(filtered)
    }
  }, [files, selectedExtensions])

  // 폼 제출: FormData로 githubLink 또는 file을 백엔드로 POST 전송
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!githubLink && !file) {
      alert("Please enter a GitHub link or upload a ZIP file.")
      return
    }
    const formData = new FormData()
    if (githubLink) {
      formData.append('githubLink', githubLink)
    }
    if (file) {
      formData.append('file', file)
    }
    try {
      const response = await fetch('http://127.0.0.1:5000/go', {
        method: 'POST',
        body: formData
        // Content-Type는 FormData 사용 시 브라우저가 자동 설정합니다.
      })
      if (response.ok) {
        const result = await response.json()
        console.log('Response from backend:', result)
        setSessionId(result.session_id)
        setFiles(result.file_paths)
        setShowFiles(true)
        setSelectedExtensions([])
      } else {
        const err = await response.json()
        console.error('Backend error:', err)
      }
    } catch (error) {
      console.error('Error during fetch:', error)
    }
  }

  const toggleExtension = (ext: string) => {
    setSelectedExtensions(prev => 
      prev.includes(ext) 
        ? prev.filter(e => e !== ext) 
        : [...prev, ext]
    )
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      if (droppedFile.type === 'application/zip' || droppedFile.type === 'application/x-zip-compressed') {
        handleZipFile(droppedFile)
      } else {
        alert('Please drop a ZIP file')
      }
    }
  }

  const handleZipFile = (file: File) => {
    setFile(file)
    setFileName(file.name)
    // 표시용으로 githubLink에 파일명을 넣을 수 있으나 실제 값은 사용자가 입력한 URL과 구분해야 함.
    setGithubLink(`${file.name} (Uploaded ZIP file)`)
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFileName(null)
    setGithubLink('')
    setFiles([])
    setFilteredFiles([])
    setShowFiles(false)
    setExtensions([])
    setSelectedExtensions([])
  }

  return (
    <div className="w-full">
      <div
        className={`w-full max-w-4xl mx-auto rounded-lg p-2 ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } transition-colors`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <form onSubmit={handleFormSubmit} className="w-full">
          <div className="relative flex">
            <input 
              type="text" 
              placeholder="Enter GitHub link or drag and drop a ZIP file" 
              value={githubLink}
              onChange={(e) => setGithubLink(e.target.value)}
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <button 
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-colors"
              disabled={!githubLink && !file}
            >
              Go
            </button>
          </div>
        </form>
      </div>
      
      {fileName && (
        <div className="mt-3 w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b45ce"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M21 8v13H3V8"></path>
                <path d="M1 3h22v5H1z"></path>
              </svg>
              <span className="font-medium text-sm">{fileName}</span>
            </div>
            <button
              onClick={handleRemoveFile}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Remove file"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showFiles && extensions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn w-full max-w-4xl mx-auto">
          {extensions.map((ext, index) => (
            <div 
              key={ext}
              className="animate-scaleIn"
              style={{animationDelay: `${index * 50}ms`}}
            >
              <button
                onClick={() => toggleExtension(ext)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedExtensions.includes(ext)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ext}
                <span className="ml-1">
                  {selectedExtensions.includes(ext) ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                  )}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {showFiles && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6 animate-slideUp w-full max-w-6xl mx-auto max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Files</h2>
            {selectedExtensions.length > 0 && (
              <button 
                onClick={() => setSelectedExtensions([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center p-2 hover:bg-gray-50 rounded transition-colors animate-fadeIn"
                style={{animationDelay: `${Math.min(index * 50, 1000)}ms`}}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3b45ce"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 flex-shrink-0"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                  <path d="M16 13H8"></path>
                  <path d="M16 17H8"></path>
                  <path d="M10 9H8"></path>
                </svg>
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
          {filteredFiles.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No files match the selected filters
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FileFetcher