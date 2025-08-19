import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { Source_Sans_3, Source_Serif_4 } from "next/font/google"
import { ChatSection } from '@/components/chat'
import { validateAccessCode } from '@/lib/access-control'
import TableOfContents from '@/components/TableOfContents'

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
})

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
})

// PDF.js viewer type declarations
type PDFViewerApp = {
  page: number;
  pagesCount?: number;
  pdfDocument?: {
    numPages?: number;
  };
  initializedPromise?: Promise<void>;
  eventBus?: { 
    dispatch: (type: string, detail?: object) => void;
    on?: (event: string, callback: () => void) => void;
    off?: (event: string, callback: () => void) => void;
  };
  pdfViewer?: {
    currentScaleValue: string | number;
  };
};

declare global {
  interface Window {
    PDFViewerApplication?: PDFViewerApp;
  }
}


export default function SessionPage() {
  const router = useRouter()
  const { accessCode } = router.query
  const [sessionData, setSessionData] = useState<{
    valid: boolean;
    documentId?: string;
    document?: { 
      title: string; 
      description: string;
      fileName: string; 
    };
    deliberationTitle?: string;
    error?: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPdf, setShowPdf] = useState(true)
  const [showTOC, setShowTOC] = useState(true)
  const [chatInteractions, setChatInteractions] = useState<string[]>([])

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const PDF_SRC_BASE = "/documents/EN-2024-FINAL-GenAI-Community-Forum-Info-Pack.pdf"

  // Handle TOC section clicks
  const handleTOCSectionClick = (sectionId: string, page: number) => {
    jumpToPage(page);
    setChatInteractions(prev => [...new Set([...prev, sectionId])]);
  };

  const jumpToPage = (page: number, snippet?: string) => {
    setShowPdf(true);
    const p = Math.max(1, Math.floor(page || 1));
    const iframe = iframeRef.current;
    if (!iframe) return;

    const base = `/pdfjs/web/viewer.html?file=${encodeURIComponent(PDF_SRC_BASE)}`;
    const win = iframe.contentWindow as Window | null;

    // Store search text for later use when PDF is ready
    if (snippet && snippet.trim()) {
      pendingQueryRef.current = snippet;
    }

    const app = win?.PDFViewerApplication;

    if (pdfjsReadyRef.current && app) {
      // PDF viewer is ready: jump to page and highlight
      app.page = p;
      if (pendingQueryRef.current) {
        highlightOnce(win!, pendingQueryRef.current);
        pendingQueryRef.current = null;
      }
    } else {
      // PDF viewer not ready: remember page and force reload
      pendingPageRef.current = p;
      iframe.src = `${base}&v=${Date.now()}#disableHistory=true&page=${p}&zoom=auto`;
    }

  };

  const pdfjsReadyRef = useRef(false);
  const pendingPageRef = useRef<number | null>(null);
  const pendingQueryRef = useRef<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!router.isReady) return;                           // 等 URL 參數準備好
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

        // 1) Call validation API
        const data = await validateAccessCode(code);
        if (!data) throw new Error('Invalid access code');

        // 2) Update state
        if (!cancelled) setSessionData(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Access validation failed.';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [router.isReady, accessCode]);

  // Handle PDF zoom when layout changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !showPdf) return;

    const handleZoom = () => {
      try {
        const win = iframe.contentWindow;
        if (win && win.PDFViewerApplication) {
          const app = win.PDFViewerApplication;
          if (app.pdfViewer) {
            app.pdfViewer.currentScaleValue = 'auto';
          }
        }
      } catch (error) {
        console.debug('PDF zoom adjustment blocked (expected for cross-origin)');
      }
    };

    const timeoutId = setTimeout(handleZoom, 1000);
    return () => clearTimeout(timeoutId);
  }, [showPdf, showTOC]);

  // Highlight text in PDF and clear after 3 seconds
  function highlightOnce(win: Window, raw: string) {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    const q = (raw || '')
      .replace(/\s+/g, ' ')
      .replace(/[\[\]]/g, '')
      .trim()
      .slice(0, 120);

    const app = win.PDFViewerApplication;
    const eventBus = app?.eventBus;
    if (!eventBus || !q) return;

    eventBus.dispatch('find', {
      source: null,
      type: 'find',
      query: q,
      phraseSearch: true,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
    });

    clearTimerRef.current = setTimeout(() => {
      eventBus.dispatch('find', {
        source: null,
        type: 'find',
        query: '',
        phraseSearch: true,
        caseSensitive: false,
        entireWord: false,
        highlightAll: false,
        findPrevious: false,
      });
    }, 3000);
  }


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

  const { document, deliberationTitle } = sessionData || {}

  return (
    <>
      <Head>
        <title>{document?.title || 'Loading'} - Your Deliberation Guide</title>
        <meta name="description" content={`${deliberationTitle || 'Deliberation'}: ${document?.description || 'Loading document...'}`} />
      </Head>

      <div className={`${sourceSans.variable} ${sourceSerif.variable} h-screen bg-gray-50 flex flex-col font-sans overflow-hidden`}>
        <div className="flex-1 flex min-h-0">
          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-row">
            <div className="w-full mx-auto p-3 lg:p-6 flex-1 flex flex-row gap-3 lg:gap-6 min-h-0">
              {/* Left Side - Chat */}
              <div className={`chat-section ${showPdf ? (showTOC ? 'w-[30%]' : 'w-1/2') : 'w-full'} min-h-0 overflow-hidden transition-all duration-300`}>
                <style jsx>{`
                  @media (max-width: 640px) {
                    .chat-section {
                      width: 100% !important;
                    }
                  }
                `}</style>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#a70532] p-4 lg:p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 !opacity-100">
                      Your Deliberation Guide
                    </h2>
                    <div className="flex items-center space-x-2 h-[30px]">
                      {!showPdf && (
                        <button
                          onClick={() => setShowPdf(true)}
                          className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
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

              {/* Right Side - PDF Viewer with embedded TOC */}
              <div className={`pdf-section ${showPdf ? (showTOC ? 'w-[70%]' : 'w-1/2') : 'w-0'} min-h-0 overflow-hidden transition-all duration-300`}>
                <style jsx>{`
                  @media (max-width: 640px) {
                    .pdf-section {
                      display: none !important;
                    }
                  }
                `}</style>
                <div className={`${showPdf ? 'opacity-100' : 'opacity-0 pointer-events-none'} bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#a70532] p-6 flex flex-col h-full transition-opacity duration-300`}>
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 !opacity-100">
                      Your Briefing Material
                    </h2>
                    <div className="flex items-center space-x-2 h-[30px]">
                      <button
                        onClick={() => setShowTOC(!showTOC)}
                        className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
                      >
                        {showTOC ? 'Hide Contents' : 'Show Contents'}
                      </button>
                      <button
                        onClick={() => setShowPdf(false)}
                        className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
                      >
                        Close Document
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden flex">
                    {/* Table of Contents - Embedded */}
                    {showTOC && (
                      <div className="w-[28.57%] flex-shrink-0 border-r border-gray-200 mr-4">
                        <TableOfContents
                          onSectionClick={handleTOCSectionClick}
                          chatInteractions={chatInteractions}
                        />
                      </div>
                    )}
                    
                    {/* PDF Viewer */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <iframe
                        ref={iframeRef}
                        src={`/pdfjs/web/viewer.html?file=${encodeURIComponent(PDF_SRC_BASE)}#page=1&zoom=auto`}
                        className="w-full h-full border-0 rounded-md"
                        title="Briefing Materials"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
