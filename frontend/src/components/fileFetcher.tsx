import React, { useState, useEffect, useRef } from 'react'

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
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const filesContainerRef = useRef<HTMLDivElement>(null)

  // 나머지 useEffect 및 함수들 (변경 없음)
  useEffect(() => {
    const handleScroll = () => {
      if (filesContainerRef.current) {
        const { top } = filesContainerRef.current.getBoundingClientRect()
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  useEffect(() => {
    if (filteredFiles.length > 0) {
      setSelectedFiles(new Set(filteredFiles))
    } else {
      setSelectedFiles(new Set())
    }
  }, [filteredFiles])

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

  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(filePath)) {
        newSet.delete(filePath)
      } else {
        newSet.add(filePath)
      }
      return newSet
    })
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
    setSelectedFiles(new Set())
  }

  // 새로운 함수: 파일 경로를 표시에 적합하게 처리
  const getDisplayPath = (filePath: string) => {
    const pathParts = filePath.split('/')
    
    // 파일 이름 (마지막 부분)
    const fileName = pathParts[pathParts.length - 1]
    
    // 경로 길이가 3 이하면 그대로 반환
    if (pathParts.length <= 3) {
      return fileName
    }
    
    // 최상위 폴더와 최하위 폴더만 표시 (중간은 '...'로 대체)
    const topFolder = pathParts[0]
    const bottomFolder = pathParts[pathParts.length - 2]
    
    return `${topFolder}/.../${bottomFolder}/${fileName}`
  }

  // Merge & Copy 버튼 클릭 핸들러
  const handleMergeAndCopy = () => {
    console.log("Merge & Copy clicked! Selected files:", Array.from(selectedFiles))
    // 여기에 실제 병합 및 복사 로직을 추가할 수 있습니다.
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* 입력 창 */}
      <div className="w-full flex justify-center">
        <div
          className={`w-full max-w-[800px] rounded-lg p-2 ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          } transition-colors`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <form onSubmit={handleFormSubmit} className="w-full flex justify-center">
            <div className="relative flex w-full">
              <input 
                type="text" 
                placeholder="Enter GitHub link or drag and drop a ZIP file" 
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                className={`w-full px-4 py-3 pr-24 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base transition-colors ${
                  isDragging ? 'bg-blue-100 border-blue-600' : 'bg-white'
                }`}
                style={{width: '700px'}}
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
      </div>

      {/* 업로드된 파일 이름 표시 */}
      {fileName && (
        <div className="mt-3 w-full max-w-[800px] mx-auto">
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

      {/* 확장자 필터 */}
      {showFiles && extensions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn w-full max-w-[800px] mx-auto justify-center">
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
          {selectedExtensions.length > 0 && (
            <button 
              onClick={() => setSelectedExtensions([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* 파일 선택 창 및 선택된 파일 컨테이너 */}
      {showFiles && (
        <div className="w-full flex justify-center mt-4 relative" ref={filesContainerRef}>
          <div className="w-full max-w-[800px] mx-auto relative">
            {/* 파일 선택 창 */}
            <div className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-4 animate-slideUp w-full h-[500px] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Files</h2>
                  {selectedExtensions.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Filtered by: {selectedExtensions.join(', ')}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="animate-fadeIn"
                      style={{animationDelay: `${Math.min(index * 50, 1000)}ms`}}
                    >
                      <input
                        type="checkbox"
                        id={`file-${index}`}
                        className="hidden peer"
                        checked={selectedFiles.has(file)}
                        onChange={() => toggleFileSelection(file)}
                      />
                      <label
                        htmlFor={`file-${index}`}
                        className="flex items-center p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors peer-checked:border-blue-600 peer-checked:bg-blue-50 text-xs"
                        title={file}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#3b45ce"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 flex-shrink-0"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                        </svg>
                        <span className="truncate flex-grow">{getDisplayPath(file)}</span>
                        {selectedFiles.has(file) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 ml-1">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                {filteredFiles.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No files match the selected filters
                  </div>
                )}
              </div>
            </div>

            {/* 선택된 파일 컨테이너와 Merge & Copy 버튼 */}
            <div className="absolute top-0 left-[calc(100%+16px)] w-[200px] h-[450px] border border-gray-200 rounded-lg shadow-lg bg-white animate-slideRight flex flex-col">
              <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-sm">Selected Files</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {Array.from(selectedFiles).length} files
                </p>
              </div>
              <div className="p-2 overflow-y-auto flex-grow">
                {Array.from(selectedFiles).map((file, index) => (
                  <div 
                    key={index}
                    className="p-1 hover:bg-gray-100 rounded text-xs flex items-center animate-fadeIn"
                    style={{animationDelay: `${Math.min(index * 30, 500)}ms`}}
                    title={file}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3b45ce"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1 flex-shrink-0"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    </svg>
                    <span className="truncate">{getDisplayPath(file)}</span>
                  </div>
                ))}
                {selectedFiles.size === 0 && (
                  <div className="text-center py-5 text-gray-500 text-xs">
                    No files selected
                  </div>
                )}
              </div>
              {/* Merge & Copy 버튼 - 하얀색 배경에 파란색 글자 */}
              <div className="p-2 border-t border-gray-200">
                <button
                  onClick={handleMergeAndCopy}
                  className="w-full px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium border border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:text-blue-300 disabled:border-blue-300 disabled:cursor-not-allowed"
                  disabled={selectedFiles.size === 0}
                >
                  Merge & Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileFetcher