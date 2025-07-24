import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Source_Sans_3, Source_Serif_4 } from "next/font/google"
import { ChatSection } from '@/components/chat'
import { validateAccessCode } from '@/lib/access-control'

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
})

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
})

export default function SessionPage() {
  const router = useRouter()
  const { accessCode } = router.query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessionData, setSessionData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPdf, setShowPdf] = useState(true)

  useEffect(() => {
    if (accessCode && typeof accessCode === 'string') {
      const result = validateAccessCode(accessCode)
      
      if (!result.valid) {
        setError(result.error || 'Invalid access code')
        setIsLoading(false)
        return
      }
      
      setSessionData(result)
      setIsLoading(false)
    }
  }, [accessCode])

  if (isLoading) {
    return (
      <div className={`${sourceSans.variable} ${sourceSerif.variable} font-sans min-h-screen flex items-center justify-center bg-gray-50`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a70532] mx-auto mb-4"></div>
          <p className="text-gray-600">Validating access and loading your document...</p>
        </div>
      </div>
    )
  }

  if (error || !sessionData) {
    return (
      <div className={`${sourceSans.variable} ${sourceSerif.variable} font-sans min-h-screen flex items-center justify-center bg-gray-50`}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Invalid access code. Please check your code and try again.'}
          </p>
          <Link
            href="/"
            className="bg-[#a70532] text-white px-6 py-2 rounded-lg hover:bg-[#8b0429] inline-block transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    )
  }

  const { document, deliberationTitle } = sessionData

  return (
    <>
      <Head>
        <title>{document.title} - Your Deliberation Guide</title>
        <meta name="description" content={`${deliberationTitle}: ${document.description}`} />
      </Head>

      <div className={`${sourceSans.variable} ${sourceSerif.variable} h-screen bg-gray-50 flex flex-col font-sans overflow-hidden`}>
        <div className="flex-1 flex min-h-0">
          <div className="max-w-7xl mx-auto p-6 flex-1 flex gap-6 min-h-0">
            {/* Left Side - Chat */}
            <div className={`${showPdf ? 'w-1/2' : 'w-full'} min-h-0 overflow-hidden transition-all duration-300`}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#a70532] p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h2 className="text-xl font-semibold">
                    Your Deliberation Guide
                  </h2>
                  {!showPdf && (
                    <button
                      onClick={() => setShowPdf(true)}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
                    >
                      Open Document
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full">
                    <ChatSection />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - PDF Viewer */}
            {showPdf && (
              <div className="w-1/2 min-h-0 overflow-hidden">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#a70532] p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-xl font-semibold">
                      Your Briefing Material
                    </h2>
                    <button
                      onClick={() => setShowPdf(false)}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <iframe
                      src="/documents/new-school-briefing-materials.pdf"
                      className="w-full h-full border-0 rounded-md"
                      title="Briefing Materials"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
