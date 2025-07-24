import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const getInitialMessages = (): Message[] => [
  {
    role: 'assistant',
    content: `👋  Welcome! I'm here to help you explore the New School Policy Deliberation briefing.

🔒  I can only answer questions based on this document — not from outside sources.

🎯 I can help you understand key sections, explain complex ideas, and highlight important points for discussion.

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
  const [messages, setMessages] = useState<Message[]>(getInitialMessages())
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

    // Simulate AI response
    const documentFocusedResponses = [
      "Based on the specific content in your assigned document, here's what I found...",
      "Looking at the evidence presented in this briefing document...",
      "According to the proposals outlined in your document...", 
      "The document specifically mentions this in section... let me break it down for you...",
      "This is an important point covered in your briefing. The document suggests...",
      "I can only discuss what's contained in your assigned document, and on this topic it states...",
    ]

    const mockContent = documentFocusedResponses[Math.floor(Math.random() * documentFocusedResponses.length)] + 
      " [This would be replaced with actual document-based AI responses in the real implementation]"

    // Add assistant message with streaming effect
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    const words = mockContent.split(' ')
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50))
      const streamedContent = words.slice(0, i + 1).join(' ')
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: streamedContent }
      ])
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
