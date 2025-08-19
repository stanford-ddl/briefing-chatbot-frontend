/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'

type Citation = { page?: string; file?: string; snippet?: string }

interface Message {
  role: 'user' | 'assistant'
  content: string
  citations?: Record<string, Citation>
}

// function renderWithCitations(msg: Message) {
//   // 把文字中的 [1] [2] ... 變成可點擊 span
//   const parts: (string | React.ReactNode)[] = []
//   const regex = /\[(\d+)\]/g
//   let lastIndex = 0
//   const text = msg.content ?? ''

//   for (let m; (m = regex.exec(text));) {
//     const idx = m.index
//     const n = m[1] // citation number as string
//     if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))
//     const pageStr = msg.citations?.[n]?.page
//     const page = pageStr ? parseInt(pageStr, 10) : undefined

//     parts.push(
//       <span
//         key={`c-${idx}`}
//         onClick={() => page && onJumpToPage?.(page)}
//         className={`inline-flex items-center px-1.5 rounded cursor-pointer 
//           ${page ? 'text-[#a70532] hover:underline' : 'text-gray-500'}`}
//         title={page ? `Jump to page ${page}` : 'No page in citation'}
//       >
//         [{n}]
//       </span>
//     )
//     lastIndex = idx + m[0].length
//   }
//   if (lastIndex < text.length) parts.push(text.slice(lastIndex))
//   return <div className="whitespace-pre-wrap">{parts}</div>
// }

export function ChatSection({ onJumpToPage }: { onJumpToPage?: (page: number, query?: string) => void }) {
  const getInitialMessages = (): Message[] => [
    {
      role: 'assistant',
      content: `👋  Welcome! I'm here to help you explore your briefing material.

🔒  I can only answer questions based on your briefing material document.

🎯 I can help you understand key sections, explain ideas, and highlight important points for discussion.

💬  What would you like to explore?`,
    },
  ]

  const SUGGESTED_PROMPTS = [
    "What's a summary of this document?",
    "Why is this issue important?",
    "What should I focus on before the group discussion?"
  ]

  const [messages, setMessages] = useState<Message[]>(() => getInitialMessages())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // --- ① 放到元件內，就能直接使用 onJumpToPage ---
  const renderWithCitations = (msg: Message): React.ReactNode => {
    const parts: React.ReactNode[] = []
    const regex = /\[(\d+)\]/g
    let lastIndex = 0
    const text = msg.content ?? ''
    let m: RegExpExecArray | null

    while ((m = regex.exec(text))) {
      const idx = m.index
      const n = m[1] // 編號
      if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))
      const pageStr = msg.citations?.[n]?.page
      const page = pageStr ? parseInt(pageStr, 10) : undefined

      const snippet = msg.citations?.[n]?.snippet

      parts.push(
        <span
          key={`c-${idx}`}
          onClick={() => page && onJumpToPage?.(page, snippet)}
          className={`inline-flex items-center px-1.5 rounded cursor-pointer ${page ? 'text-gray-600 hover:bg-red-100 hover:text-red-700' : 'text-gray-500'}`}
          title={page ? `Jump to page ${page}` : 'No page in citation'}
        >
          [{n}]
        </span>
      )
      lastIndex = idx + m[0].length
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))
    return <>{parts}</>
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    handleSubmit(prompt)
  }

  const handleSubmit = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setIsLoading(true)

    try {
      const useMockResponses = process.env.NODE_ENV === 'development' &&
        process.env.NEXT_PUBLIC_SKIP_BACKEND_AUTH === 'true'

      if (useMockResponses) {
        await new Promise(r => setTimeout(r, 1000))
        let mockResponse = `Thanks for your question: "${text}". `
        if (text.toLowerCase().includes('summary')) {
          mockResponse += 'This document provides a comprehensive overview...'
        } else if (text.toLowerCase().includes('important')) {
          mockResponse += "This issue is important because ..."
        } else if (text.toLowerCase().includes('focus') || text.toLowerCase().includes('discussion')) {
          mockResponse += "Before the group discussion, you should focus on ..."
        } else {
          mockResponse += "I'm designed to help you understand the briefing document ..."
        }
        setMessages(prev => [...prev, { role: 'assistant', content: mockResponse }])
      } else {
        const response = await apiClient.sendMessage(text)

        // --- ② 抽出內容 + citations ---
        function extract(payload: unknown) {
          let content = ''
          let citations: Record<string, Citation> | undefined

          if (payload && typeof payload === 'object') {
            const d = payload as any
            content = d?.answer?.answer ?? d?.answer ?? d?.message ?? ''
            citations = d?.answer?.citations ?? d?.citations
            return { content, citations }
          }

          if (typeof payload === 'string') {
            const s = payload.trim()
            try {
              const j = JSON.parse(s)
              content = j?.answer?.answer ?? j?.answer ?? j?.message ?? s
              citations = j?.answer?.citations ?? j?.citations
              return { content, citations }
            } catch {
              // ---- Python dict 風格（單引號的 key / 有時 value 也是單引號）→ 轉合法 JSON 再 parse ----
              const s = payload.trim()

              // 1) 把 key 的單引號換成雙引號：{ 'a': -> { "a":
              // 2) 把「單引號的值」換成雙引號，但保留本來就是雙引號的值
              // 3) 把 None/True/False 轉成 JSON 的 null/true/false
              const jsonish = s
                // keys: {'key': → {"key":
                .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
                // values: : '...'(允許含 \' 的情況)
                .replace(/:\s*'((?:\\'|[^'])*?)'/g, (_, g1) => {
                  // 先把字串裡的反斜線轉義、把已存在的 " 轉義、把 \' 還原成單引號
                  const safe = g1.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\\'/g, "'")
                  return ': "' + safe + '"'
                })
                // Python → JSON literals
                .replace(/\bNone\b/g, 'null')
                .replace(/\bTrue\b/g, 'true')
                .replace(/\bFalse\b/g, 'false')

              let obj: any
              try {
                obj = JSON.parse(jsonish)
              } catch {
                // 真的 parse 不下去就回原字串
                return { content: s, citations: undefined }
              }

              const content = obj?.answer?.answer ?? obj?.answer ?? obj?.message ?? s
              const citations = obj?.answer?.citations ?? obj?.citations
              return { content, citations }
            }

          }
          return { content: '', citations: undefined }
        }

        const { content, citations } = extract(response)
        setMessages(prev => [...prev, { role: 'assistant', content, citations }])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or check if you need to log in again.'
      }])
    }

    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 mb-4 overflow-y-auto">
        <div className="space-y-4 p-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-lg ${message.role === 'user'
                ? 'bg-gray-100 text-gray-900 rounded-br-sm'
                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}>
                <div className="whitespace-pre-wrap">
                  {renderWithCitations(message)}
                  {message.citations && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(message.citations).map(([n, c]) => {
                        const p = c?.page ? parseInt(c.page, 10) : undefined

                        return (
                          <button
                            key={n}
                            onClick={() => p && onJumpToPage?.(p, c?.snippet)}
                            className="text-xs border border-gray-200 rounded-full px-2 py-0.5 hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-colors text-gray-600"
                            title={p ? `Jump to page ${p}` : 'No page info'}
                          >
                            [{n}] {p ? `p.${p}` : ''}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-900 rounded-lg rounded-bl-sm px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="mb-3 flex-shrink-0">
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-shrink-0">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-[#a70532] focus:shadow-[0_0_0_2px_rgba(167,5,50,0.1)] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-[#a70532] text-white rounded-lg hover:bg-[#8b0429] focus:outline-none focus:ring-2 focus:ring-[#a70532] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
