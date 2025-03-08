'use client'

import { useState } from 'react'
import FileFetcher from '@/components/fileFetcher'

export default function Home() {
  const [githubLink, setGithubLink] = useState<string>('')

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="text-center w-full max-w-2xl px-4">
        <div className="flex items-center justify-center mb-10">
          {/* 간단한 로고/타이틀 */}
          <svg
            version="1.1"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-4"
          >
            <path
              d="M24 16 L16 24 L24 32 L16 40 L24 48"
              stroke="#3B82F6"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M40 16 L48 24 L40 32 L48 40 L40 48"
              stroke="#3B82F6"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="32"
              y1="24"
              x2="32"
              y2="40"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="24"
              y1="32"
              x2="40"
              y2="32"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
            CoPT
          </h1>
        </div>
        
        <FileFetcher 
          githubLink={githubLink}
          setGithubLink={(value) => setGithubLink(value)}
        />
      </div>
    </main>
  )
}