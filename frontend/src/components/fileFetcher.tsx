import React, { useState, useEffect } from 'react'

interface FileFetecherProps {
  githubLink: string
  setGithubLink: (link: string) => void
  onSubmit: (e: React.FormEvent) => void
}

const FileFetcher: React.FC<FileFetecherProps> = ({
  githubLink,
  setGithubLink,
  onSubmit
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [showFiles, setShowFiles] = useState(false)
  const [extensions, setExtensions] = useState<string[]>([])
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([])
  const [filteredFiles, setFilteredFiles] = useState<string[]>([])

  // Extract extensions from file list
  useEffect(() => {
    if (files.length > 0) {
      const exts = files
        .map(file => {
          const parts = file.split('.')
          return parts.length > 1 ? `.${parts[parts.length - 1]}` : null
        })
        .filter((ext): ext is string => ext !== null)
        
      // Get unique extensions
      const uniqueExts = Array.from(new Set(exts)).sort()
      setExtensions(uniqueExts)
    }
  }, [files])

  // Filter files based on selected extensions
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
    
    // Simulate getting file list from backend
    setTimeout(() => {
      const mockFiles = [
        'index.js', 'styles.css', 'components/Header.jsx', 'utils/helpers.ts', 'README.md',
        'john.py', 'aiden.py', 'chul.py', 'jay.cpp', 'package.json', 
        'tsconfig.json', 'next.config.js', 'app/layout.tsx', 'app/page.tsx'
      ]
      setFiles(mockFiles)
      setFilteredFiles(mockFiles) // Initialize filtered files with all files
      setSelectedFolder(githubLink.split('/').pop() || 'Repository')
      setShowFiles(true)
      setSelectedExtensions([]) // Reset selected extensions
    }, 500)
  }

  const toggleExtension = (ext: string) => {
    setSelectedExtensions(prev => 
      prev.includes(ext) 
        ? prev.filter(e => e !== ext) 
        : [...prev, ext]
    )
  }

  const removeFolder = () => {
    setSelectedFolder(null)
    setGithubLink('')
    setFiles([])
    setFilteredFiles([])
    setShowFiles(false)
    setExtensions([])
    setSelectedExtensions([])
  }

  return (
    <div className="w-full">
      {selectedFolder && (
        <div className="mb-4 flex items-center bg-gray-100 rounded-lg p-3 animate-fadeIn">
          <div className="flex items-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3b45ce"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"></path>
            </svg>
            <span className="font-medium">{selectedFolder}</span>
          </div>
          <button 
            onClick={removeFolder} 
            className="ml-2 rounded-full p-1 hover:bg-gray-200"
            aria-label="Remove folder"
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
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="w-full max-w-4xl mx-auto">
        <div className="relative flex">
          <input 
            type="text" 
            placeholder="Enter GitHub link or folder path" 
            value={githubLink}
            onChange={(e) => setGithubLink(e.target.value)}
            className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <button 
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-colors"
            disabled={!githubLink}
          >
            Go
          </button>
        </div>
      </form>

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