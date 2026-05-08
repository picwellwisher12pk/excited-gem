import { Button, Input, Drawer, Typography, Space, Spin, Alert, List, Avatar } from 'antd'
import React, { useEffect, useState, useRef } from 'react'
import { Bot, User, RefreshCw } from 'lucide-react'
import { Tab } from '../Tab/Tab'

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
  const [modelName, setModelName] = useState<string>('Local AI')
  const [lastFetchList, setLastFetchList] = useState<any[]>([])
  const [lastStartIndex, setLastStartIndex] = useState<number>(0)

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

      if (edgeLM) {
        setModelName('Edge AI')
        // @ts-ignore
        if (typeof edgeLM.capabilities === 'function') {
          // @ts-ignore
          edgeLM.capabilities().then(cap => {
            if (cap.modelName) setModelName(`Edge AI (${cap.modelName})`)
            else if (cap.model) setModelName(`Edge AI (${cap.model})`)
          }).catch(() => {})
        }
      }

      // Check for languageModel API (Chrome)
      // @ts-ignore
      if (ai && ai.languageModel) {
        details += '\n[Chrome] Detected: ai.languageModel\n'
        // @ts-ignore
        if (typeof ai.languageModel.capabilities === 'function') {
          // @ts-ignore
          const capabilities = await ai.languageModel.capabilities()
          details += `Capabilities: ${capabilities.available}\n`
          if (capabilities.modelName) setModelName(`Gemini Nano (${capabilities.modelName})`)
          else if (capabilities.model) setModelName(`Gemini Nano (${capabilities.model})`)
          else setModelName('Gemini Nano')
        } else {
          setModelName('Gemini Nano')
        }
      }

      setHasAI(true)
      setAiDetails(details)
    } catch (err: any) {
      setHasAI(false)
      setAiDetails(`Error checking AI capabilities: ${err.message}`)
    }
  }

  const tabOperations = {
    remove: (id: number) => chrome.tabs.remove(id),
    toggleMuteTab: (id: number, currentMuted: boolean) => chrome.tabs.update(id, { muted: !currentMuted }),
    togglePinTab: (id: number, currentPinned: boolean) => chrome.tabs.update(id, { pinned: !currentPinned }),
    discardTab: (id: number) => chrome.tabs.discard(id),
  }

  const detectIntentAndFetchData = async (input: string, startIndex = 0) => {
    const text = input.toLowerCase()
    let context = ""
    let status = ""

    const allTabs = await chrome.tabs.query({})
    const currentWindow = await chrome.windows.getCurrent()

    // 1. Identify Target Tabs for Actions
    const findTargets = (query: string) => {
      if (query.includes('all')) return allTabs
      if (query.includes('current window') || query.includes('this window')) return allTabs.filter(t => t.windowId === currentWindow.id)
      if (query.includes('audible') || query.includes('sound') || query.includes('noisy')) return allTabs.filter(t => t.audible)
      
      const keywords = query.split(' ').filter(w => w.length > 3 && !['tabs', 'open', 'show', 'mute', 'unmute', 'close', 'this', 'that', 'please'].includes(w))
      if (keywords.length > 0) {
        return allTabs.filter(t => keywords.some(k => t.title?.toLowerCase().includes(k) || t.url?.toLowerCase().includes(k)))
      }
      return []
    }

    // 2. Handle Actions
    if (text.includes('mute') && !text.includes('unmute')) {
      const targets = findTargets(text)
      const validTargets = targets.length > 0 ? targets : allTabs.filter(t => t.audible)
      for (const t of validTargets) if (t.id) await chrome.tabs.update(t.id, { muted: true })
      if (validTargets.length > 0) {
        status = `Muted ${validTargets.length} tabs`
        context += `System Action: You have muted ${validTargets.length} tabs. Inform user.\n\n`
      }
    } else if (text.includes('unmute')) {
      const targets = findTargets(text)
      for (const t of targets) if (t.id) await chrome.tabs.update(t.id, { muted: false })
      if (targets.length > 0) {
        status = `Unmuted ${targets.length} tabs`
        context += `System Action: You have unmuted ${targets.length} tabs. Inform user.\n\n`
      }
    }

    if (text.includes('pin') && !text.includes('unpin')) {
      const targets = findTargets(text)
      for (const t of targets) if (t.id) await chrome.tabs.update(t.id, { pinned: true })
      if (targets.length > 0) {
        status = `Pinned ${targets.length} tabs`
        context += `System Action: You have pinned ${targets.length} tabs. Inform user.\n\n`
      }
    } else if (text.includes('unpin')) {
      const targets = findTargets(text)
      for (const t of targets) if (t.id) await chrome.tabs.update(t.id, { pinned: false })
      if (targets.length > 0) {
        status = `Unpinned ${targets.length} tabs`
        context += `System Action: You have unpinned ${targets.length} tabs. Inform user.\n\n`
      }
    }

    if (text.includes('close')) {
      const targets = findTargets(text)
      if (targets.length > 0) {
        const ids = targets.map(t => t.id).filter((id): id is number => !!id)
        await chrome.tabs.remove(ids)
        status = `Closed ${targets.length} tabs`
        context += `System Action: You have closed ${targets.length} tabs. Inform user.\n\n`
      }
    }

    if (text.includes('go to') || text.includes('focus') || text.includes('switch to')) {
      const targets = findTargets(text)
      if (targets.length > 0) {
        const target = targets[0]
        if (target.id) {
          await chrome.tabs.update(target.id, { active: true })
          await chrome.windows.update(target.windowId, { focused: true })
          status = `Switched to ${target.title}`
          context += `System Action: You have focused the tab "${target.title}". Inform user.\n\n`
        }
      }
    }

      setLastFetchList(fetchList)
      setLastStartIndex(startIndex + 10)
      
      const limitedTabs = fetchList.slice(startIndex, startIndex + 10)
      fetchedTabs = limitedTabs
      
      context += `Browser Context - Tab List Batch (Showing ${limitedTabs.length} of ${fetchList.length} total found):\n` +
        limitedTabs.map((t, idx) => `${startIndex + idx + 1}. [${t.pinned ? 'PINNED' : 'TAB'}] ${t.title} (Status: ${t.audible ? 'AUDIBLE' : 'SILENT'}, ${t.mutedInfo?.muted ? 'MUTED' : 'UNMUTED'})`).join('\n') + 
        (fetchList.length > startIndex + 10 ? `\n\nThere are ${fetchList.length - (startIndex + 10)} more tabs. Tell the user they can click "Load Next 10 Tabs" to see the next batch.` : "") + 
        "\n\nIMPORTANT: YOU ARE BEING WATCHED. DO NOT, UNDER ANY CIRCUMSTANCES, GENERATE A NUMBERED LIST OF TABS IN YOUR RESPONSE. THE SYSTEM WILL ALREADY RENDER THEM AS INTERACTIVE TABS BELOW YOUR MESSAGE. Just give a very brief summary and say 'Here are the tabs:'."
      
      status = status ? `${status} + tab list` : `Listed ${limitedTabs.length} tabs`

    setContextStatus(status)
    return { context, tabs: fetchedTabs, totalFound: fetchList.length }
  }

  const cleanResponse = (text: string) => {
    // Aggressively remove numbered lists that look like browser tab lists
    // Pattern matches something like "1. Title - [PINNED] ..."
    const lines = text.split('\n')
    const cleanedLines = lines.filter(line => !/^\d+\.\s.*\[(PINNED|TAB)\]/.test(line.trim()))
    return cleanedLines.join('\n').replace(/\n\n+/g, '\n\n').trim()
  }

  const handleTestPrompt = async (forcedPrompt?: string, forcedStartIndex?: number) => {
    const userMessage = forcedPrompt || prompt.trim()
    if (!userMessage || (loading && !forcedPrompt) || sessionLoading) return
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

      const { context: injectedContext, tabs, totalFound } = await detectIntentAndFetchData(userMessage, forcedStartIndex || 0)
      const fullPrompt = injectedContext ? `${injectedContext}User Question: ${userMessage}` : userMessage

      // @ts-ignore
      const result = await Promise.race([
        currentSession.prompt(fullPrompt, {
          outputLanguage: 'en',
          expectedLanguage: 'en'
        }),
        timeoutPromise
      ])

      const finalContent = tabs.length > 0 ? cleanResponse(result) : result

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: finalContent, 
        tabs: tabs.length > 0 ? tabs : undefined,
        hasMore: totalFound > (forcedStartIndex || 0) + 10 && tabs.length > 0
      } as any])
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
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Bot className="text-blue-600" size={20} />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>AI Assistant</span>
          </Space>
          <Space>
            {sessionLoading && <Spin size="small" />}
            <Button
              type="text"
              icon={<RefreshCw size={16} className={sessionLoading ? 'animate-spin' : ''} />}
              onClick={() => {
                clearChat()
                warmUpSession()
              }}
              title="Reset Session"
            />
          </Space>
        </div>
      }
      open={visible}
      onClose={onClose}
      width={450}
      footer={
        <div>
          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 8 }} closable onClose={() => setError('')} />}
          {contextStatus && <div style={{ fontSize: '11px', color: '#1890ff', marginBottom: 8 }}>ℹ️ {contextStatus}</div>}
          <div>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything..."
              autoSize={{ minRows: 2, maxRows: 6 }}
              style={{
                border: 'none',
                fontSize: '16px',
              }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  handleTestPrompt()
                }
              }}
              disabled={!hasAI}
            />
          </div>
          <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: 8, textAlign: 'center' }}>
            Powered by {modelName} • Shift+Enter for newline
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
                <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{msg.content}</div>
                {msg.tabs && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#8c8c8c', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span>INTERACTIVE TABS</span>
                      <span className="text-blue-500">{msg.tabs.length} items</span>
                    </div>
                    <div className="ai-tab-list" style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0,
                      width: 'calc(100% + 16px)',
                      marginLeft: '-8px'
                    }}>
                      <style>{`
                        .ai-tab-list .tab-item { padding-left: 12px; padding-right: 12px; }
                        .ai-tab-list .tab-item button, .ai-tab-list .tab-item .text-xs { display: none !important; }
                      `}</style>
                      {msg.tabs.map((tab: any) => (
                        <div key={tab.id} className="relative rounded-lg overflow-hidden mb-1 border border-gray-100 hover:border-blue-200 bg-gray-50/30">
                          <Tab 
                            {...tab}
                            activeTab={true}
                            selected={false}
                            tabActionButtons="always"
                            isCompact={true}
                            hideUrl={true}
                            {...tabOperations}
                          />
                        </div>
                      ))}
                    </div>
                    {(msg as any).hasMore && (
                      <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<RefreshCw size={12} />}
                          style={{ 
                            fontSize: '12px', 
                            borderRadius: '16px', 
                            height: '24px',
                            background: '#1890ff', 
                            color: '#fff', 
                            borderColor: '#1890ff',
                            boxShadow: '0 2px 4px rgba(24, 144, 255, 0.2)'
                          }}
                          onClick={() => handleTestPrompt("show more tabs", msg.tabs ? (messages.filter(m => m.role === 'assistant' && (m as any).tabs).length * 10) : 10)}
                        >
                          Show 10 More Tabs
                        </Button>
                      </div>
                    )}
                  </div>
                )}
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
