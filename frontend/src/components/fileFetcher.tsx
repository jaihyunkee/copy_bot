import React, { useState, useEffect, useRef } from 'react';

interface FileFetcherProps {
  githubLink: string;
  setGithubLink: (link: string) => void;
}

const FileFetcher: React.FC<FileFetcherProps> = ({
  githubLink,
  setGithubLink,
}) => {
  const [sessionId, setSessionId] = useState<string>('');
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

  useEffect(() => {
    const storedId = localStorage.getItem('session_id');
    if (storedId) {
      setSessionId(storedId);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('session_id', sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    const handleScroll = () => {
      if (filesContainerRef.current) {
        const { top } = filesContainerRef.current.getBoundingClientRect();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubLink && !file) {
        alert("Please enter a GitHub link or upload a ZIP file.");
        return;
    }
    setIsGoLoading(true);

    // Reset Selected Files
    setSelectedFiles(new Set());

    const formData = new FormData();
    if (sessionId) {
        formData.append('session_id', sessionId);
    }
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

        await new Promise(resolve => setTimeout(resolve, 1500));

        if (response.ok) {
            const result = await response.json();
            if (result.session_id) {
                setSessionId(result.session_id);
            }
            setFiles(result.file_paths);
            setShowFiles(true);
            setSelectedExtensions([]);
        } else {
            const err = await response.json();
            alert(`Error: ${err.error || 'Failed to process the request'}`);
        }
    } catch (error) {
        alert("An error occurred while sending the request.");
    } finally {
        setIsGoLoading(false);
    }
};

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
    setGithubLink('');
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileName(null);
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

  const toggleExtension = (ext: string) => {
    setSelectedExtensions(prev =>
      prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
    );
  };

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

  const getDisplayPath = (filePath: string) => {
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    if (pathParts.length === 1) return fileName;
    if (pathParts.length === 2) return `${pathParts[0]}/${fileName}`;
    const topFolder = pathParts[0];
    const bottomFolder = pathParts[pathParts.length - 2];
    return `${topFolder}/.../${bottomFolder}/${fileName}`;
  };

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

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (response.ok) {
        const mergedResult = await response.text();
        setMergedCode(mergedResult);
        navigator.clipboard.writeText(mergedResult)
          .then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          })
          .catch(err => console.error('Failed to copy:', err));
        setTimeout(() => {
          if (mergedCodeRef.current) {
            mergedCodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        const errorText = await response.text();
        alert("Failed to merge codes: " + errorText);
      }
    } catch (error) {
      alert("An error occurred while fetching merged codes.");
    } finally {
      setIsMergeLoading(false);
    }
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(mergedCode)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy:', err));
  };

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
      centerMergedCodeContainer();
      return () => {
        mergedCodeRef.current?.removeEventListener('mouseup', handleMouseUp);
        observer.disconnect();
      };
    }
  }, [mergedCode]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-center">
        <form 
          onSubmit={handleFormSubmit} 
          className="w-full max-w-[1200px] flex justify-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="relative flex flex-col w-full">
            {fileName && (
              <div className="flex items-center self-start mb-2 bg-blue-50 border border-blue-200 px-2 py-1">
                <span className="text-sm text-blue-600 font-medium">{fileName}</span>
                <button
                  onClick={handleRemoveFile}
                  className="ml-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  title="Remove file"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex">
              <input
                type="text"
                placeholder="GitHub link or drag/drop a ZIP file"
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                className={`flex-grow border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDragging ? 'bg-blue-50' : 'bg-white'} rounded-l-md`}
                style={{ width: '100%', minWidth: '500px' }}
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md cursor-pointer"
                disabled={!githubLink && !file}
              >
                {isGoLoading ? 'Loading...' : 'Go'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isGoLoading && (
        <div className="mt-8 w-full max-w-[800px] mx-auto flex justify-center">
          <img src="/logo.png" alt="Loading" className="w-12 h-12 animate-bounce" />
        </div>
      )}

      {showFiles && extensions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn w-full max-w-[800px] mx-auto justify-center">
          {extensions.map((ext, index) => (
            <div key={ext} className="animate-scaleIn" style={{ animationDelay: `${index * 50}ms` }}>
              <button
                onClick={() => toggleExtension(ext)}
                className={`inline-flex items-center px-3 py-1 text-sm font-medium transition-colors ${selectedExtensions.includes(ext) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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
            <button onClick={() => setSelectedExtensions([])} className="text-sm text-blue-600 hover:text-blue-800">
              Clear filters
            </button>
          )}
        </div>
      )}

      {showFiles && (
        <div className="mt-4" ref={filesContainerRef} style={{ overflow: 'visible', width: '100vw', position: 'relative', display: 'flex', justifyContent: 'center', flexWrap: 'nowrap' }}>
          <div className="bg-white border border-gray-200 p-4 animate-slideUp h-[500px] overflow-y-auto" style={{ minWidth: '400px', width: '800px', maxWidth: 'none', resize: 'horizontal', overflow: 'auto', marginRight: '16px', direction: 'rtl' }}>
            <div style={{ direction: 'ltr' }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Files</h2>
                {selectedExtensions.length > 0 && (
                  <div className="text-xs text-gray-500">Filtered by: {selectedExtensions.join(', ')}</div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredFiles.map((file, index) => (
                  <div key={index} className="animate-fadeIn" style={{ animationDelay: `${Math.min(index * 50, 1000)}ms` }}>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b45ce" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1 flex-shrink-0">
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
                <div className="text-center py-10 text-gray-500">No files match the selected filters</div>
              )}
            </div>
          </div>

          <div ref={selectedFilesContainerRef} className="border border-gray-200 shadow-lg bg-white animate-slideRight flex flex-col" style={{ width: '200px', height: '500px', minWidth: '150px', maxWidth: 'none', resize: 'horizontal', overflow: 'auto' }}>
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-sm">Selected Files</h3>
              <p className="text-xs text-gray-500 mt-1">{Array.from(selectedFiles).length} files</p>
            </div>
            <div className="p-2 overflow-y-auto flex-grow">
              {Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="p-1 hover:bg-gray-100 text-xs flex items-center animate-fadeIn" style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }} title={file}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b45ce" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1 flex-shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                  </svg>
                  <span className="truncate">{getDisplayPath(file)}</span>
                </div>
              ))}
              {selectedFiles.size === 0 && (
                <div className="text-center py-5 text-gray-500 text-xs">No files selected</div>
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

      {isMergeLoading && (
        <div className="mt-10 w-full max-w-[800px] mx-auto flex justify-center">
          <img src="/logo.png" alt="Loading" className="w-12 h-12 animate-bounce" />
        </div>
      )}

      {mergedCode && (
        <div className="mt-6" ref={mergedCodeRef} style={{ width: '100vw', position: 'relative', overflow: 'visible' }}>
          <div className="bg-white border border-gray-200 p-4 animate-slideUp resizable-container" style={{ minWidth: '400px', width: '800px', maxWidth: 'none', resize: 'horizontal', overflow: 'auto', position: 'absolute', left: '50%', transform: 'translateX(-50%)', transition: 'left 0.3s ease-in-out' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Merged Code</h2>
              <button onClick={handleCopyClick} className="text-blue-600 hover:text-blue-800 cursor-pointer focus:outline-none focus:ring-0" style={{ outline: 'none', boxShadow: 'none' }} title="Copy to clipboard">
                {isCopied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
            <div className="bg-gray-50 p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-sm text-left whitespace-pre-wrap break-words">{mergedCode}</pre>
            </div>
            <button onClick={() => setMergedCode('')} className="mt-4 text-sm text-red-600 hover:text-red-800">
              Clear merged code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileFetcher;