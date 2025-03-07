'use client'

import { useState } from 'react'
import GitHubUploader from '@/components/GitHubUploader'

export default function Home() {
  const [githubLink, setGithubLink] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitted:', githubLink)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="text-center w-full max-w-2xl px-4">
        <div className="flex items-center justify-center mb-10">
          {/* 수정된 SVG */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b45ce"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-3"
          >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>

          <h1 className="text-4xl font-bold text-blue-600">Copy Bot</h1>
        </div>
        
        <GitHubUploader 
          githubLink={githubLink}
          setGithubLink={(value) => setGithubLink(value)}
          onSubmit={(e) => handleSubmit(e)}
        />
      </div>
    </main>
  )
}