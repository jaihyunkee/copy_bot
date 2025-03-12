import React, { useState, useEffect, useRef } from 'react';

interface FileFetcherProps {
  githubLink: string;
  setGithubLink: (link: string) => void;
}

const FileFetcher: React.FC<FileFetcherProps> = ({
  githubLink,
  setGithubLink,
}) => {
  const [sessionId, setSessionId] = useState<string>(() => {
    // 마운트 시 localStorage에 session_id가 있으면 불러옴
    const storedId = localStorage.getItem('session_id');
    return storedId ? storedId : '';
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [extensions, setExtensions] = useState<string[]>([]);
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [mergedCode, setMergedCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGoLoading, setIsGoLoading] = useState(false);
  const [isMergeLoading, setIsMergeLoading] = useState(false);

  const filesContainerRef = useRef<HTMLDivElement>(null);
  const selectedFilesContainerRef = useRef<HTMLDivElement>(null);
  const mergedCodeRef = useRef<HTMLDivElement>(null);

  // sessionId 변경 시 localStorage에 저장
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('session_id', sessionId);
    }
  }, [sessionId]);

  // (디자인) 스크롤 이벤트 예시
  useEffect(() => {
    const handleScroll = () => {
      if (filesContainerRef.current) {
        const { top } = filesContainerRef.current.getBoundingClientRect();
        // console.log(top);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 파일 확장자 목록 수집
  useEffect(() => {
    if (files.length > 0) {
      const exts = files
        .map(file => {
          const parts = file.split('.');
          return parts.length > 1 ? `.${parts[parts.length - 1]}` : null;
        })
        .filter((ext): ext is string => ext !== null);
      const uniqueExts = Array.from(new Set(exts)).sort();
      setExtensions(uniqueExts);
    }
  }, [files]);

  // 확장자 필터 적용
  useEffect(() => {
    if (selectedExtensions.length === 0) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file => {
        const parts = file.split('.');
        if (parts.length > 1) {
          const ext = `.${parts[parts.length - 1]}`;
          return selectedExtensions.includes(ext);
        }
        return false;
      });
      setFilteredFiles(filtered);
    }
  }, [files, selectedExtensions]);

  // 필터 변경 시 표시된 파일들 자동 선택
  useEffect(() => {
    if (filteredFiles.length > 0) {
      setSelectedFiles(new Set(filteredFiles));
    } else {
      setSelectedFiles(new Set());
    }
  }, [filteredFiles]);

  // ==========================
  // (1) /go 엔드포인트: ZIP 업로드 or GitHub Link
  // ==========================
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubLink && !file) {
      alert("Please enter a GitHub link or upload a ZIP file.");
      return;
    }
    setIsGoLoading(true);

    const formData = new FormData();
    if (sessionId) {
      formData.append('session_id', sessionId);
    }
    // 서버에서 우선순위 결정: 파일이 있으면 unzip, 없으면 githubLink로 clone
    if (githubLink) {
      formData.append('githubLink', githubLink);
    }
    if (file) {
      formData.append('file', file);
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/go', {
        method: 'POST',
        body: formData,
      });

      // UX 상의 지연
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (response.ok) {
        const result = await response.json();
        console.log('Response from backend:', result);

        // 새 session_id가 있으면 갱신
        if (result.session_id) {
          setSessionId(result.session_id);
        }
        setFiles(result.file_paths);
        setShowFiles(true);
        setSelectedExtensions([]);
      } else {
        const err = await response.json();
        console.error('Backend error:', err);
        alert(`Error: ${err.error || 'Failed to process the request'}`);
      }
    } catch (error) {
      console.error('Error during fetch:', error);
      alert("An error occurred while sending the request.");
    } finally {
      setIsGoLoading(false);
    }
  };

  // (Drag & Drop) ZIP 파일 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      if (
        droppedFile.type === 'application/zip' ||
        droppedFile.type === 'application/x-zip-compressed'
      ) {
        handleZipFile(droppedFile);
      } else {
        alert('Please drop a ZIP file');
      }
    }
  };

  const handleZipFile = (file: File) => {
    setFile(file);
    setFileName(file.name);
    // 파일을 올리면, GitHub 링크는 비워 버린다.
    // => 서버에서 zip 우선으로 인식
    setGithubLink('');
  };

  // ZIP 파일 제거 (X 버튼)
  const handleRemoveFile = () => {
    setFile(null);
    setFileName(null);
    // 깃허브 링크도 같이 초기화할지 여부는 상황에 맞게
    setGithubLink('');
    setFiles([]);
    setFilteredFiles([]);
    setShowFiles(false);
    setExtensions([]);
    setSelectedExtensions([]);
    setSelectedFiles(new Set());
    setMergedCode('');
    setIsCopied(false);
  };

  // 확장자 필터 토글
  const toggleExtension = (ext: string) => {
    setSelectedExtensions(prev =>
      prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
    );
  };

  // 파일(체크박스) 선택
  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  // 표시에 쓸 파일명 (중간 경로 생략)
  const getDisplayPath = (filePath: string) => {
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    if (pathParts.length === 1) return fileName;
    if (pathParts.length === 2) return `${pathParts[0]}/${fileName}`;
    const topFolder = pathParts[0];
    const bottomFolder = pathParts[pathParts.length - 2];
    return `${topFolder}/.../${bottomFolder}/${fileName}`;
  };

  // ==========================
  // (2) /merge_codes: 선택된 파일 합쳐서 클립보드에 복사
  // ==========================
  const handleMergeAndCopy = async () => {
    if (!sessionId || selectedFiles.size === 0) {
      alert("No session or no files selected!");
      return;
    }
    setIsMergeLoading(true);

    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    Array.from(selectedFiles).forEach(filePath => {
      params.append('file_path', filePath);
    });

    try {
      const response = await fetch(`http://127.0.0.1:5000/merge_codes?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'text/plain' },
      });

      // UX 지연
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (response.ok) {
        const mergedResult = await response.text();
        setMergedCode(mergedResult);

        // 복사
        navigator.clipboard.writeText(mergedResult)
          .then(() => {
            console.log('Merged code copied to clipboard');
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          })
          .catch(err => console.error('Failed to copy:', err));

        // 병합 결과로 스크롤 이동
        setTimeout(() => {
          if (mergedCodeRef.current) {
            mergedCodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        const errorText = await response.text();
        console.error('Error from backend:', errorText);
        alert("Failed to merge codes: " + errorText);
      }
    } catch (error) {
      console.error('Error during merge_codes fetch:', error);
      alert("An error occurred while fetching merged codes.");
    } finally {
      setIsMergeLoading(false);
    }
  };

  // 병합된 코드 수동 복사
  const handleCopyClick = () => {
    navigator.clipboard.writeText(mergedCode)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy:', err));
  };

  // Merged Code가 리사이즈/마우스업으로 위치가 바뀌면 가운데 정렬
  const centerMergedCodeContainer = () => {
    if (mergedCodeRef.current) {
      const container = mergedCodeRef.current.querySelector('.resizable-container') as HTMLElement;
      if (container) {
        const parentWidth = window.innerWidth;
        const containerWidth = container.offsetWidth;
        const leftOffset = (parentWidth - containerWidth) / 2;
        container.style.left = `${leftOffset}px`;
      }
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      centerMergedCodeContainer();
    };
    const handleResize = () => {
      centerMergedCodeContainer();
    };

    if (mergedCodeRef.current) {
      mergedCodeRef.current.addEventListener('mouseup', handleMouseUp);
      const observer = new ResizeObserver(handleResize);
      observer.observe(mergedCodeRef.current);

      // 초기 정렬
      centerMergedCodeContainer();

      return () => {
        mergedCodeRef.current?.removeEventListener('mouseup', handleMouseUp);
        observer.disconnect();
      };
    }
  }, [mergedCode]);

  // ----------------------
  // 실제 렌더링
  // ----------------------
  return (
    <div className="w-full flex flex-col items-center">
      {/* (A) 입력 폼 영역 */}
      <div className="w-full flex justify-center">
        <div
          className={`w-full max-w-[1200px] p-2 ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          } transition-colors rounded-md`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <form onSubmit={handleFormSubmit} className="w-full flex justify-center">
            <div
              className="relative flex flex-col w-full max-w-[1200px] px-4 py-4 
                         border border-blue-500 focus-within:ring-2 
                         focus-within:ring-blue-500 text-base transition-colors bg-white rounded-md"
              style={{ minHeight: '3.5rem' }}
            >
              {/* 업로드된 ZIP 파일 표시 */}
              {fileName && (
                <div className="flex items-center self-start mb-2 bg-blue-50 border border-blue-200 px-2 py-1">
                  <span className="text-sm text-blue-600 font-medium">
                    {fileName}
                  </span>
                  <button
                    onClick={handleRemoveFile}
                    className="ml-2 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Remove file"
                    type="button"
                  >
                    <svg
                      width="14"
                      height="14"
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
              )}

              {/* GitHub Link + Go 버튼 */}
              <div className="flex">
                <input
                  type="text"
                  placeholder="GitHub link or drag/drop a ZIP file"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  className={`flex-grow border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDragging ? 'bg-blue-50' : 'bg-white'
                  }`}
                  style={{ borderRadius: '4px', width: '100%', minWidth: '500px' }}
                  />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md cursor-pointer"                  disabled={!githubLink && !file}
                >
                  {isGoLoading ? 'Loading...' : 'Go'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* (B) 로딩 (Go) */}
      {isGoLoading && (
        <div className="mt-8 w-full max-w-[800px] mx-auto flex justify-center">
          <img
            src="/logo.png"
            alt="Loading"
            className="w-12 h-12 animate-bounce"
          />
        </div>
      )}

      {/* (C) 확장자 필터 */}
      {showFiles && extensions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn w-full max-w-[800px] mx-auto justify-center">
          {extensions.map((ext, index) => (
            <div
              key={ext}
              className="animate-scaleIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => toggleExtension(ext)}
                className={`inline-flex items-center px-3 py-1 text-sm font-medium transition-colors ${
                  selectedExtensions.includes(ext)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ext}
                <span className="ml-1">
                  {selectedExtensions.includes(ext) ? (
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
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
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

      {/* (D) 파일 리스트 & 선택된 파일 */}
      {showFiles && (
        <div
          className="mt-4"
          ref={filesContainerRef}
          style={{
            overflow: 'visible',
            width: '100vw',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'nowrap',
          }}
        >
          {/* 왼쪽: 파일 리스트 */}
          <div
            className="bg-white border border-gray-200 p-4 animate-slideUp h-[500px] overflow-y-auto"
            style={{
              minWidth: '400px',
              width: '800px',
              maxWidth: 'none',
              resize: 'horizontal',
              overflow: 'auto',
              marginRight: '16px',
              direction: 'rtl',
            }}
          >
            <div style={{ direction: 'ltr' }}>
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
                    style={{ animationDelay: `${Math.min(index * 50, 1000)}ms` }}
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
                      className="flex items-center p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors peer-checked:border-blue-600 peer-checked:bg-blue-50 text-xs"
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
                      <span className="truncate flex-grow">
                        {getDisplayPath(file)}
                      </span>
                      {selectedFiles.has(file) && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-blue-600 ml-1"
                        >
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

          {/* 오른쪽: 선택된 파일 */}
          <div
            ref={selectedFilesContainerRef}
            className="border border-gray-200 shadow-lg bg-white animate-slideRight flex flex-col"
            style={{
              width: '200px',
              height: '500px',
              minWidth: '150px',
              maxWidth: 'none',
              resize: 'horizontal',
              overflow: 'auto',
            }}
          >
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-sm">Selected Files</h3>
              <p className="text-xs text-gray-500 mt-1">
                {Array.from(selectedFiles).length} files
              </p>
            </div>
            <div className="p-2 overflow-y-auto flex-grow">
              {Array.from(selectedFiles).map((file, index) => (
                <div
                  key={index}
                  className="p-1 hover:bg-gray-100 text-xs flex items-center animate-fadeIn"
                  style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
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
            <div className="p-2 border-t border-gray-200">
              <button
                onClick={handleMergeAndCopy}
                className="w-full px-4 py-2 bg-white text-blue-600 text-sm font-medium border border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:text-blue-300 disabled:border-blue-300 disabled:cursor-not-allowed cursor-pointer"
                disabled={selectedFiles.size === 0}
              >
                Merge & Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (E) 로딩 (Merge) */}
      {isMergeLoading && (
        <div className="mt-10 w-full max-w-[800px] mx-auto flex justify-center">
          <img
            src="/logo.png"
            alt="Loading"
            className="w-12 h-12 animate-bounce"
          />
        </div>
      )}

      {/* (F) 병합 결과 */}
      {mergedCode && (
        <div
          className="mt-6"
          ref={mergedCodeRef}
          style={{
            width: '100vw',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <div
            className="bg-white border border-gray-200 p-4 animate-slideUp resizable-container"
            style={{
              minWidth: '400px',
              width: '800px',
              maxWidth: 'none',
              resize: 'horizontal',
              overflow: 'auto',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              transition: 'left 0.3s ease-in-out',
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Merged Code</h2>
              <button
                onClick={handleCopyClick}
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
                title="Copy to clipboard"
              >
                {isCopied ? (
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
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
            <div className="bg-gray-50 p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-sm text-left whitespace-pre-wrap break-words">
                {mergedCode}
              </pre>
            </div>
            <button
              onClick={() => setMergedCode('')}
              className="mt-4 text-sm text-red-600 hover:text-red-800"
            >
              Clear merged code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileFetcher;