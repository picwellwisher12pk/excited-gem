import React, { useState } from 'react'
import { Modal, Button, Radio, Typography, Space, message } from 'antd'
import { Copy, Download, FileText, Code2, Check } from 'lucide-react'
import { generateMarkdownReport } from '../../services/analyticsDataService'
import type { FullAnalyticsData } from '../../services/analyticsDataService'

const { Text } = Typography

interface ExportReportModalProps {
  open: boolean
  onClose: () => void
  data: FullAnalyticsData | null
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  open,
  onClose,
  data
}) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown')
  const [copied, setCopied] = useState(false)

  if (!data) return null

  const reportText =
    format === 'markdown'
      ? generateMarkdownReport(data)
      : JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      message.success('Analytics report copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      message.error('Failed to copy to clipboard')
    }
  }

  const handleDownload = () => {
    try {
      const filename = `excited-gem-analytics-${new Date().toISOString().slice(0, 10)}.${
        format === 'markdown' ? 'md' : 'json'
      }`
      const mimeType =
        format === 'markdown' ? 'text/markdown' : 'application/json'
      const blob = new Blob([reportText], { type: `${mimeType};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success(`Downloaded ${filename}`)
    } catch {
      message.error('Failed to download report')
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <FileText className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-lg">Export Analytics Report</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="copy"
          icon={
            copied ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Copy size={16} />
            )
          }
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<Download size={16} />}
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Download File
        </Button>
      ]}
    >
      <div className="py-2 space-y-4">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Report Format:
          </Text>
          <Radio.Group
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="markdown">
              <Space size={4}>
                <FileText size={14} />
                <span>Markdown</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="json">
              <Space size={4}>
                <Code2 size={14} />
                <span>JSON</span>
              </Space>
            </Radio.Button>
          </Radio.Group>
        </div>

        <div className="relative">
          <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap border border-slate-800 shadow-inner">
            {reportText}
          </pre>
        </div>
      </div>
    </Modal>
  )
}
