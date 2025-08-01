import { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const getInitialMessages = (): Message[] => [
  {
    role: 'assistant',
    content: `👋  Welcome! I'm here to help you explore your briefing material.

🔒  I can only answer questions based on your briefing material document.

🎯 I can help you understand key sections, explain ideas, and highlight important points for discussion.

💬  What would you like to explore?`,
  },
]

// Suggested prompts that users can click
const SUGGESTED_PROMPTS = [
  "What's a summary of this document?",
  "Why is this issue important?", 
  "What should I focus on before the group discussion?"
];

export function ChatSection() {
  const [messages, setMessages] = useState<Message[]>(() => getInitialMessages())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    handleSubmit(prompt)
  }

  const handleSubmit = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text) return

    // Add user message
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Check if we should use mock responses (for development without backend)
      const useMockResponses = process.env.NODE_ENV === 'development' && 
                              process.env.NEXT_PUBLIC_SKIP_BACKEND_AUTH === 'true';

      if (useMockResponses) {
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock response based on the user's question
        let mockResponse = `Thanks for your question: "${text}". `
        
        if (text.toLowerCase().includes('summary')) {
          mockResponse += "This document provides a comprehensive overview of the 2025 GenAI Community Forum, focusing on proposals to improve school choice, admissions, and governance in NYC public high schools. The briefing includes background information, various perspectives, and important trade-offs that participants should consider during deliberation."
        } else if (text.toLowerCase().includes('important')) {
          mockResponse += "This issue is important because it directly affects how students access and succeed in NYC's public high school system. The decisions made here will impact thousands of students and families, particularly regarding equity, accessibility, and educational outcomes."
        } else if (text.toLowerCase().includes('focus') || text.toLowerCase().includes('discussion')) {
          mockResponse += "Before the group discussion, you should focus on understanding the key stakeholder perspectives, the proposed policy changes, and the potential trade-offs between different approaches. Pay attention to how different solutions might affect various communities differently."
        } else {
          mockResponse += "I'm designed to help you understand the briefing document for the GenAI Community Forum. I can explain key sections, highlight important discussion points, and help you prepare for deliberation. What specific aspect would you like to explore?"
        }
        
        const assistantMessage: Message = { role: 'assistant', content: mockResponse }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Use real API call when backend is available
        const response = await apiClient.sendMessage(text)
        
        // Add assistant message
        const assistantMessage: Message = { role: 'assistant', content: response }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Fallback to error message
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again or check if you need to log in again.' 
      }
      setMessages(prev => [...prev, errorMessage])
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
      {/* Chat Messages Area */}
      <div className="flex-1 min-h-0 mb-4 overflow-y-auto">
        <div className="space-y-4 p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-gray-100 text-gray-900 rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-900 rounded-lg rounded-bl-sm px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Suggested Prompts - Small bubbles above input */}
      {messages.length <= 1 && (
        <div className="mb-3 flex-shrink-0">
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors border border-gray-200 hover:border-red-300"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Chat Input */}
      <div className="flex-shrink-0">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
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
