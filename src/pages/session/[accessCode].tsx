/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from 'react'

import { useRouter } from 'next/router'
// import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Source_Sans_3, Source_Serif_4 } from "next/font/google"
import { ChatSection } from '@/components/chat'
import { validateAccessCode } from '@/lib/access-control'

// import { useRef } from 'react'

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


  const iframeRef = useRef<HTMLIFrameElement>(null)

  const PDF_SRC_BASE = "/documents/EN-2024-FINAL-GenAI-Community-Forum-Info-Pack.pdf"

  // const jumpToPage = (page: number) => {
  //   // 打開右側 PDF
  //   setShowPdf(true)
  //   // 變更 iframe 的 src hash，瀏覽器原生 PDF 檢視器支援 #page=
  //   const url = `${PDF_SRC_BASE}#page=${page}`
  //   if (iframeRef.current) {
  //     // 若同一份文件多次跳頁，直接改 src 也會生效（hash change 觸發）
  //     iframeRef.current.src = url
  //   }
  // }

  const jumpToPage = (page: number) => {
    setShowPdf(true);
    const p = Math.max(1, Math.floor(page || 1));
    const iframe = iframeRef.current;
    if (!iframe) return;

    const win = iframe.contentWindow as any;
    if (pdfjsReadyRef.current && win?.PDFViewerApplication) {
      // ✅ 最佳：直接指派頁碼，不重載
      win.PDFViewerApplication.page = p;
    } else {
      // 尚未 ready 的第一次：用 hash 導航（pdf.js 會吃）
      const base = `/pdfjs/web/viewer.html?file=${encodeURIComponent(PDF_SRC_BASE)}`;
      iframe.src = `${base}#page=${p}`;
    }
  };

  const pdfjsReadyRef = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;                 // 等 URL 參數準備好
    const code = typeof accessCode === 'string' ? accessCode : '';

    if (!code) {
      setError('Missing access code.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError('');

        // 1) 驗證存取碼（請確認 validateAccessCode 回傳型別）
        const data = await validateAccessCode(code);
        if (!data) throw new Error('Invalid access code');

        // 2) 寫入你頁面渲染需要的資料
        if (!cancelled) {
          setSessionData(data);                  // { document, deliberationTitle, ... }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Access validation failed.');
      } finally {
        if (!cancelled) setIsLoading(false);     // ← 確保關閉 loading
      }
    })();

    return () => { cancelled = true; };
  }, [router.isReady, accessCode]);


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
          <div className="max-w-7xl mx-auto p-3 md:p-6 flex-1 flex flex-col md:flex-row gap-3 md:gap-6 min-h-0">
            {/* Left Side - Chat */}
            <div className={`w-full ${showPdf ? 'md:w-1/2' : 'md:w-full'} min-h-0 overflow-hidden transition-all duration-300`}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#a70532] p-4 md:p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h2 className="text-lg md:text-xl font-semibold">
                    Your Deliberation Guide
                  </h2>
                  <div className="flex items-center h-[30px]">
                    {!showPdf && (
                      <button
                        onClick={() => setShowPdf(true)}
                        className="hidden md:inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
                      >
                        Open Document
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full">
                    <ChatSection onJumpToPage={jumpToPage} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - PDF Viewer - Hidden on mobile */}
            <div className={`hidden md:block ${showPdf ? 'md:w-1/2' : 'md:w-0'} min-h-0 overflow-hidden transition-all duration-300`}>
              <div className={`${showPdf ? 'opacity-100' : 'opacity-0 pointer-events-none'} bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#a70532] p-6 flex flex-col h-full transition-opacity duration-300`}>
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h2 className="text-xl font-semibold">
                    Your Briefing Material
                  </h2>
                  <div className="flex items-center h-[30px]">
                    <button
                      onClick={() => setShowPdf(false)}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    src={`/pdfjs/web/viewer.html?file=${encodeURIComponent(PDF_SRC_BASE)}#page=1`}
                    // src={`${PDF_SRC_BASE}#page=1`}
                    // src="/documents/EN-2024-FINAL-GenAI-Community-Forum-Info-Pack.pdf"
                    className="w-full h-full border-0 rounded-md"
                    title="Briefing Materials"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
