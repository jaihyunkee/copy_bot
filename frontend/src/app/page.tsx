'use client'

import { useState } from 'react'
import FileFetcher from '@/components/fileFetcher'
import Image from 'next/image' // Next.js에서 이미지를 사용하기 위해 import

export default function Home() {
  const [githubLink, setGithubLink] = useState<string>('')

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="text-center w-full max-w-2xl px-4">
        <div className="flex items-center justify-center mb-10">
          {/* 로고 사이즈를 40x40에서 60x60으로 증가 */}
          <Image
            src="/copyt_logo.png" // public 폴더에 있는 파일 경로
            alt="CoPyT Logo"
            width={60}
            height={60}
            className="mr-3"
          />
          {/* C, P, T 크기를 text-5xl에서 text-[2.5rem]으로 조정 */}
          <h1 className="text-4xl font-bold text-blue-600">
            <span className="text-[2.5rem] font-extrabold">C</span>o
            <span className="text-[2.5rem] font-extrabold">P</span>
            <span className="text-[2.5rem] font-extrabold">T</span>
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