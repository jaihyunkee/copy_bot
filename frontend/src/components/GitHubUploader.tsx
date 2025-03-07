import React from 'react'

interface GitHubUploaderProps {
  githubLink: string
  setGithubLink: (link: string) => void
  onSubmit: (e: React.FormEvent) => void; // HTMLFormElement 제거
}

const GitHubUploader: React.FC<GitHubUploaderProps> = ({
  githubLink,
  setGithubLink,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-4xl mx-auto">
      <div className="relative flex">
        <input 
          type="text" 
          placeholder="Enter GitHub link or folder path" 
          value={githubLink}
          onChange={(e) => setGithubLink(e.target.value)}
          className="w-[600px] px-4 py-3 pr-24 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
  )
}

export default GitHubUploader