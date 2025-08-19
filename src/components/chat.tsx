/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Citation = { page?: string; file?: string; snippet?: string }

interface Message {
    role: 'user' | 'assistant'
    content: string
    citations?: Record<string, Citation>
}

// ---- 簡易 HAST 遍歷（避免額外安裝 unist-util-visit）----
type Node = any
function visit(
    node: Node,
    test: (n: Node) => boolean,
    cb: (n: Node, index: number, parent: Node) => void,
    parent: Node | null = null
) {
    if (!node) return
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) visit(node[i], test, cb, node)
        return
    }
    if (test(node)) {
        const p = parent ?? { children: [node] }
        const idx = p.children?.indexOf?.(node) ?? -1
        cb(node, idx, p)
    }
    const kids = node.children
    if (Array.isArray(kids)) kids.forEach((k: Node) => visit(k, test, cb, node))
}

// ---- 將 \n、\t、\uXXXX 等從「字面」還原成真正字元 ----
function decodeEscapes(s: string | undefined | null) {
    if (!s) return s ?? ''
    let out = s
        .replace(/\r\n/g, '\n')   // 真 CRLF → LF
        .replace(/\\r\\n/g, '\n') // 字面 "\r\n" → LF
        .replace(/\\n/g, '\n')    // 字面 "\n" → LF
        .replace(/\\t/g, '\t')    // 字面 "\t" → TAB
    out = out.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    )
    return out
}

// ---- 接受多種後端回傳（物件 / JSON 字串 / Python dict 風格式）並萃取 ----
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
        const s0 = payload.trim()
        try {
            const j = JSON.parse(s0)
            content = j?.answer?.answer ?? j?.answer ?? j?.message ?? s0
            citations = j?.answer?.citations ?? j?.citations
            return { content, citations }
        } catch {
            // Python dict 風格 → 轉 JSON-ish 再 parse
            const jsonish = s0
                .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":') // key 單引號 → 雙引號
                .replace(/:\s*'((?:\\'|[^'])*?)'/g, (_, g1) => { // value 單引號 → 雙引號
                    const safe = g1.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\\'/g, "'")
                    return ': "' + safe + '"'
                })
                .replace(/\bNone\b/g, 'null')
                .replace(/\bTrue\b/g, 'true')
                .replace(/\bFalse\b/g, 'false')

            try {
                const j = JSON.parse(jsonish)
                content = j?.answer?.answer ?? j?.answer ?? j?.message ?? s0
                citations = j?.answer?.citations ?? j?.citations
                return { content, citations }
            } catch {
                return { content: s0, citations: undefined }
            }
        }
    }

    return { content: '', citations: undefined }
}

// ---- 把文字中的 [1] [2] ... 轉成可點擊 <span>，不破壞 Markdown 結構 ----
// function makeRehypeCitations(
//     onJumpToPage?: (page: number, query?: string) => void,
//     citations?: Record<string, Citation>
// ) {
//     const plugin = () => {
//         return (tree: Node) => {
//             visit(
//                 tree,
//                 (n) => n.type === 'text' && typeof n.value === 'string' && /\[\d+\]/.test(n.value),
//                 (node, index, parent) => {
//                     const text: string = node.value
//                     const parts: Node[] = []
//                     const re = /\[(\d+)\]/g
//                     let last = 0
//                     let m: RegExpExecArray | null

//                     while ((m = re.exec(text))) {
//                         const i = m.index
//                         const nStr = m[1]
//                         if (i > last) {
//                             parts.push({ type: 'text', value: text.slice(last, i) })
//                         }
//                         const c = citations?.[nStr]
//                         const page = c?.page ? parseInt(c.page, 10) : undefined

//                         parts.push({
//                             type: 'element',
//                             tagName: 'span',
//                             properties: {
//                                 style: `cursor:${page ? 'pointer' : 'default'};padding:0 2px;`,
//                                 className: page ? ['text-[#a70532]', 'hover:underline'] : ['text-gray-500'],
//                                 onClick: page ? () => onJumpToPage?.(page, c?.snippet) : undefined,
//                                 title: page ? `Jump to page ${page}` : 'No page in citation',
//                             },
//                             children: [{ type: 'text', value: `[${nStr}]` }],
//                         })
//                         last = i + m[0].length
//                     }
//                     if (last < text.length) {
//                         parts.push({ type: 'text', value: text.slice(last) })
//                     }

//                     if (parent && Array.isArray(parent.children) && index >= 0) {
//                         parent.children.splice(index, 1, ...parts)
//                     }
//                 }
//             )
//         }
//     }
//     return plugin
// }

// ---- 把 [1]、[1, 3]、[1-3]/[1–3] 都轉成可點擊的 citation ----
function makeRehypeCitations(
    onJumpToPage?: (page: number, query?: string) => void,
    citations?: Record<string, Citation>
) {
    const plugin = () => {
        return (tree: any) => {
            // 掃描所有 text node，尋找 [ ... ] 區塊；允許多數字與各種分隔
            visit(
                tree,
                (n) => n.type === 'text' && typeof n.value === 'string' && /\[[^\]]+\]/.test(n.value),
                (node, index, parent) => {
                    const text: string = node.value
                    const parts: any[] = []
                    const re = /\[([^\]]+)\]/g  // 抓整個方括號內容
                    let last = 0
                    let m: RegExpExecArray | null

                    while ((m = re.exec(text))) {
                        const i = m.index
                        const inner = m[1] // 括號內字串（可能是 "1", "1, 3", "1-3", "1–3" ...）

                        // 先放入括號左邊的原始文字
                        if (i > last) parts.push({ type: 'text', value: text.slice(last, i) })

                        // 將 inner tokenize：保留分隔符（逗號、空白等），把數字或 range 作為獨立 token
                        const tokens = inner.split(/(\d+\s*[–-]\s*\d+|\d+)/g) // () 讓分隔符也保留在陣列
                        const children: any[] = []

                        // 左括號
                        children.push({ type: 'text', value: '[' })

                        for (const tok of tokens) {
                            if (!tok) continue

                            // range: e.g., "1-3" 或 "1 – 3"
                            const rangeMatch = tok.match(/^(\d+)\s*[–-]\s*(\d+)$/)
                            if (rangeMatch) {
                                const start = parseInt(rangeMatch[1], 10)
                                const end = parseInt(rangeMatch[2], 10)
                                if (!Number.isNaN(start) && !Number.isNaN(end)) {
                                    const step = start <= end ? 1 : -1
                                    let first = true
                                    for (let k = start; step > 0 ? k <= end : k >= end; k += step) {
                                        if (!first) children.push({ type: 'text', value: ', ' }) // 用逗號分隔展開的數字
                                        first = false

                                        const c = citations?.[String(k)]
                                        const page = c?.page ? parseInt(c.page, 10) : undefined

                                        children.push({
                                            type: 'element',
                                            tagName: 'span',
                                            properties: {
                                                style: `cursor:${page ? 'pointer' : 'default'};padding:0 2px;`,
                                                className: page ? ['text-[#a70532]', 'hover:underline'] : ['text-gray-500'],
                                                onClick: page ? () => onJumpToPage?.(page, c?.snippet) : undefined,
                                                title: page ? `Jump to page ${page}` : 'No page in citation',
                                            },
                                            children: [{ type: 'text', value: String(k) }],
                                        })
                                    }
                                    continue
                                }
                            }

                            // 單一數字
                            const numMatch = tok.match(/^\d+$/)
                            if (numMatch) {
                                const nStr = numMatch[0]
                                const c = citations?.[nStr]
                                const page = c?.page ? parseInt(c.page, 10) : undefined
                                children.push({
                                    type: 'element',
                                    tagName: 'span',
                                    properties: {
                                        style: `cursor:${page ? 'pointer' : 'default'};padding:0 2px;`,
                                        className: page ? ['text-gray-600', 'hover:bg-red-100', 'hover:text-red-700'] : ['text-gray-500'],
                                        onClick: page ? () => onJumpToPage?.(page, c?.snippet) : undefined,
                                        title: page ? `Jump to page ${page}` : 'No page in citation',
                                    },
                                    children: [{ type: 'text', value: nStr }],
                                })
                            } else {
                                // 不是數字或 range 的部分（例如 ", "、" 、" 等分隔）照原樣放回去
                                children.push({ type: 'text', value: tok })
                            }
                        }

                        // 右括號
                        children.push({ type: 'text', value: ']' })

                        // 整組 [ ... ] 作為一個 inline span wrapper（保持行內）
                        parts.push({
                            type: 'element',
                            tagName: 'span',
                            properties: {},
                            children,
                        })

                        last = i + m[0].length
                    }

                    // 放入剩餘尾端文字
                    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })

                    // 用新 parts 取代原本的 text node
                    if (parent && Array.isArray(parent.children) && index >= 0) {
                        parent.children.splice(index, 1, ...parts)
                    }
                }
            )
        }
    }
    return plugin
}


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

    const renderWithCitations = (msg: Message): React.ReactNode => {
        const rehypeCitations = makeRehypeCitations(onJumpToPage, msg.citations)
        return (
            <div>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeCitations]}
                    skipHtml
                >
                    {msg.content ?? ''}
                </ReactMarkdown>

                {/* 只在 assistant 訊息顯示 Related chips，避免重複 */}
                {msg.role === 'assistant' && msg.citations && (() => {
                    const filtered = Object.entries(msg.citations).filter(([_, c]) => (c as any)?.score >= 8)
                    if (filtered.length === 0) return null
                    return (
                        <div className="mt-2 flex flex-col gap-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Relevant Contents</span>
                            <div className="flex flex-wrap gap-2">
                                {filtered.map(([n, c]) => {
                                    const p = c?.page ? parseInt(c.page, 10) : undefined
                                    return (
                                        <button
                                            key={n}
                                            onClick={() => p && onJumpToPage?.(p, c?.snippet)}
                                            className="text-xs border border-gray-200 rounded-full px-2 py-0.5 hover:border-100 hover:text-red-700 hover:border-red-300 transition-colors text-gray-600"
                                            title={p ? `Jump to page ${p}` : 'No page info'}
                                        >
                                            [{n}] {p ? `p.${p}` : ''}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })()}
            </div>
        )
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

        // 先 push 使用者訊息
        setMessages(prev => [...prev, { role: 'user', content: text }])
        setInput('')
        setIsLoading(true)

        try {
            const useMockResponses = process.env.NODE_ENV === 'development' &&
                process.env.NEXT_PUBLIC_SKIP_BACKEND_AUTH === 'true'

            if (useMockResponses) {
                await new Promise(r => setTimeout(r, 800))
                let mockResponse = `Thanks for your question: "${text}". `
                if (text.toLowerCase().includes('summary')) {
                    mockResponse += 'This document provides a comprehensive overview...'
                } else if (text.toLowerCase().includes('important')) {
                    mockResponse += 'This issue is important because ...'
                } else if (text.toLowerCase().includes('focus') || text.toLowerCase().includes('discussion')) {
                    mockResponse += 'Before the group discussion, you should focus on ...'
                } else {
                    mockResponse += "I'm designed to help you understand the briefing document ..."
                }
                setMessages(prev => [...prev, { role: 'assistant', content: mockResponse }])
            } else {
                // 取得後端回應 → 萃取 → 解碼跳脫 → set
                const response = await apiClient.sendMessage(text)
                const { content, citations } = extract(response)
                const contentDecoded = decodeEscapes(content)

                // 可選：檢查是否 \\n 已變成真換行
                // console.log('[raw]', JSON.stringify(content).slice(0, 120))
                // console.log('[decoded]', JSON.stringify(contentDecoded).slice(0, 120))

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: contentDecoded,
                    citations
                }])
            }
        } catch (err) {
            console.error('Chat error:', err)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again or check if you need to log in again.'
            }])
        } finally {
            setIsLoading(false)
        }
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
                                {renderWithCitations(message)}
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
