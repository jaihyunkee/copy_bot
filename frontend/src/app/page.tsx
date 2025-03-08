'use client'

import { useState } from 'react'
import FileFetcher from '@/components/fileFetcher'
import Image from 'next/image'

export default function Home() {
  const [githubLink, setGithubLink] = useState<string>('')

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="text-center w-full max-w-2xl px-4">
        <div className="flex items-center justify-center mb-10">
          {/* 로고 */}
          <svg
            version="1.1"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
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

          {/* CoPT 텍스트 디자인 */}
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
            <span className="font-extrabold tracking-tight">C</span>
            <span className="font-extrabold tracking-tight">o</span>
            <span className="font-extrabold tracking-tight">P</span>
            <span className="font-extrabold tracking-tight">T</span>
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
