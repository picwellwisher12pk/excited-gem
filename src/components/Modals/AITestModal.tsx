import { Button, Input, Drawer, Typography, Space, Spin, Alert, List, Avatar } from 'antd'
import React, { useEffect, useState, useRef } from 'react'
import { Bot, User, Send, Trash2, RefreshCw } from 'lucide-react'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

interface AITestModalProps {
  visible: boolean
  onClose: () => void
}

export const AITestModal: React.FC<AITestModalProps> = ({
  visible,
  onClose
}) => {
  const [hasAI, setHasAI] = useState<boolean | null>(null)
  const [aiDetails, setAiDetails] = useState<string>('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
  const [prompt, setPrompt] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [session, setSession] = useState<any>(null)
  const [sessionLoading, setSessionLoading] = useState<boolean>(false)
  const [contextStatus, setContextStatus] = useState<string>('')
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (visible) {
      checkNativeAI()
      warmUpSession()
    } else {
      // Clean up session when modal closes
      if (session && typeof session.destroy === 'function') {
        session.destroy()
      }
      setSession(null)
    }
  }, [visible])

  const createNewSession = async () => {
    const ai = (window as any).ai || ((window as any).chrome && (window as any).chrome.aiOriginTrial) || (navigator as any).ai
    const LanguageModel = (window as any).LanguageModel

    if (LanguageModel) {
      return await LanguageModel.create({ outputLanguage: 'en', expectedLanguage: 'en' })
    } else if (ai && ai.languageModel) {
      return await ai.languageModel.create({ outputLanguage: 'en', expectedLanguage: 'en' })
    } else if (ai && ai.createTextSession) {
      return await ai.createTextSession()
    }
    throw new Error('No appropriate AI session builder found.')
  }

  const warmUpSession = async () => {
    setSessionLoading(true)
    try {
      const newSession = await createNewSession()
      setSession(newSession)
    } catch (err: any) {
      console.warn('Session warm-up failed:', err.message)
    } finally {
      setSessionLoading(false)
    }
  }

  const checkNativeAI = async () => {
    try {
      // @ts-ignore
      const ai = window.ai || (window.chrome && window.chrome.aiOriginTrial) || navigator.ai

      // Edge namespaces
      // @ts-ignore
      const edgeLM = window.LanguageModel
      // @ts-ignore
      const edgeSummarizer = window.Summarizer
      // @ts-ignore
      const edgeWriter = window.Writer
      // @ts-ignore
      const edgeRewriter = window.Rewriter

      if (!ai && !edgeLM && !edgeSummarizer && !edgeWriter && !edgeRewriter) {
        setHasAI(false)
        setAiDetails('No supported AI API (window.ai, LanguageModel, Summarizer, etc.) defined in this browser.')
        return
      }

      let details = 'AI API namespaces detected:\n'
      if (ai) details += '- Prompt API (Generic/Chrome)\n'
      if (edgeLM) {
        details += '- Edge LanguageModel API\n'
        // @ts-ignore
        if (typeof edgeLM.capabilities === 'function') {
          // @ts-ignore
          const capabilities = await edgeLM.capabilities()
          details += `  Capabilities: ${JSON.stringify(capabilities, null, 2)}\n`
        }
      }
      if (edgeSummarizer) details += '- Edge Summarizer API\n'
      if (edgeWriter) details += '- Edge Writer API\n'
      if (edgeRewriter) details += '- Edge Rewriter API\n'

      // Check for languageModel API (Chrome)
      // @ts-ignore
      if (ai && ai.languageModel) {
        details += '\n[Chrome] Detected: ai.languageModel\n'
        // @ts-ignore
        if (typeof ai.languageModel.capabilities === 'function') {
          // @ts-ignore
          const capabilities = await ai.languageModel.capabilities()
          details += `Capabilities: ${capabilities.available}\n`
        }
      }

      setHasAI(true)
      setAiDetails(details)
    } catch (err: any) {
      setHasAI(false)
      setAiDetails(`Error checking AI capabilities: ${err.message}`)
    }
  }

  const detectIntentAndFetchData = async (input: string) => {
    const text = input.toLowerCase()
    let context = ""
    let status = ""

    if (text.includes('tabs') || text.includes('browser') || text.includes('open')) {
      const tabs = await chrome.tabs.query({})
      const limitedTabs = tabs.slice(0, 15)
      context += `Browser Context (Showing ${limitedTabs.length} of ${tabs.length} tabs):\n` + 
        limitedTabs.map(t => `- ${t.title} (${t.url})`).join('\n') + "\n\n"
      status = `Attached ${limitedTabs.length} tabs`
    } else if (text.includes('this page') || text.includes('active') || text.includes('here')) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab) {
        context += `Browser Context (Active Tab):\n- Title: ${tab.title}\n- URL: ${tab.url}\n\n`
        status = "Attached active tab info"
      }
    }

    setContextStatus(status)
    return context
  }

  const handleTestPrompt = async () => {
    if (!prompt.trim() || loading || sessionLoading) return

    const userMessage = prompt.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setPrompt('')
    setLoading(true)
    setError('')

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI Request Timed Out (60s). The model is taking a while to process or initialize.')), 60000)
    })

    try {
      let currentSession = session
      if (!currentSession) {
        currentSession = await Promise.race([createNewSession(), timeoutPromise])
        setSession(currentSession)
      }

      const injectedContext = await detectIntentAndFetchData(userMessage)
      const fullPrompt = injectedContext ? `${injectedContext}User Question: ${userMessage}` : userMessage

      // @ts-ignore
      const result = await Promise.race([
        currentSession.prompt(fullPrompt, {
          outputLanguage: 'en',
          expectedLanguage: 'en'
        }),
        timeoutPromise
      ])
      
      setMessages(prev => [...prev, { role: 'assistant', content: result }])
    } catch (err: any) {
      setError(err.message || 'Failed to generate response.')
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setError('')
    setContextStatus('')
  }

  return (
    <Drawer
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Bot className="text-blue-600" size={20} />
            <Title level={5} style={{ margin: 0 }}>AI Assistant</Title>
          </Space>
          <Space>
            {sessionLoading && <Spin size="small" />}
            <Button 
              type="text" 
              icon={<Trash2 size={16} />} 
              onClick={clearChat}
              title="Clear Chat"
            />
            <Button 
              type="text" 
              icon={<RefreshCw size={16} className={sessionLoading ? 'animate-spin' : ''} />} 
              onClick={warmUpSession}
              title="Reset AI Session"
            />
          </Space>
        </Space>
      }
      open={visible}
      onClose={onClose}
      width={450}
      extra={
        <Button type="text" onClick={onClose}>Close</Button>
      }
      footer={
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 8 }} closable onClose={() => setError('')} />}
          {contextStatus && <div style={{ fontSize: '11px', color: '#1890ff', marginBottom: 4 }}>ℹ️ {contextStatus}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything about your tasks or browser..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  handleTestPrompt()
                }
              }}
              disabled={!hasAI}
            />
            <Button 
              type="primary" 
              shape="circle" 
              icon={<Send size={18} />} 
              onClick={handleTestPrompt}
              loading={loading}
              disabled={!hasAI || !prompt.trim()}
            />
          </div>
          <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: 8, textAlign: 'center' }}>
            Powered by Local Browser AI • Shift+Enter for newline
          </div>
        </div>
      }
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}
    >
      <div 
        ref={scrollRef}
        style={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40, padding: '0 20px' }}>
            <Avatar icon={<Bot />} size={64} style={{ backgroundColor: '#e6f7ff', color: '#1890ff', marginBottom: 16 }} />
            <Title level={4}>How can I help today?</Title>
            <Paragraph type="secondary">
              I'm your local AI assistant. I can see your open tabs and help you organize your work. 
              Try asking <b>"What tabs do I have open?"</b>
            </Paragraph>
            
            {!hasAI && (
              <Alert
                message="AI Capabilities Not Detected"
                description={aiDetails || "Please check if Prompt API is enabled in your browser flags."}
                type="warning"
                showIcon
              />
            )}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i} 
              style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                gap: 8,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <Avatar 
                size="small" 
                icon={msg.role === 'user' ? <User size={14} /> : <Bot size={14} />} 
                style={{ backgroundColor: msg.role === 'user' ? '#1890ff' : '#52c41a' }}
              />
              <div 
                style={{ 
                  backgroundColor: msg.role === 'user' ? '#1890ff' : '#fff',
                  color: msg.role === 'user' ? '#fff' : 'rgba(0, 0, 0, 0.85)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px'
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 8 }}>
            <Avatar size="small" icon={<Bot size={14} />} style={{ backgroundColor: '#52c41a' }} />
            <div style={{ padding: '8px 12px' }}>
              <Spin size="small" />
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}
