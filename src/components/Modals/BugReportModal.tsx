import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Collapse,
  Typography,
  Tag,
  Alert,
  message,
  Space
} from 'antd'
import {
  Bug,
  Copy,
  ExternalLink,
  Send,
  AlertTriangle,
  CheckCircle2,
  Cpu
} from 'lucide-react'
import { analytics } from '../../utils/analytics'
import type {
  BugReportPayload,
  DiagnosticInfo,
  IssueCategory,
  StoredErrorLog
} from '../../types/telemetry'

const { TextArea } = Input
const { Text, Paragraph } = Typography

interface BugReportModalProps {
  visible: boolean
  onClose: () => void
  initialError?: StoredErrorLog | null
}

const CATEGORY_OPTIONS: { label: string; value: IssueCategory; color: string }[] = [
  { label: 'Bug / Broken Feature', value: 'bug', color: 'red' },
  { label: 'Extension Crash / Freeze', value: 'crash', color: 'volcano' },
  { label: 'YouTube Video Detection Issue', value: 'youtube', color: 'orange' },
  { label: 'Performance / High Memory', value: 'performance', color: 'gold' },
  { label: 'Feature Request', value: 'feature_request', color: 'blue' },
  { label: 'General Feedback', value: 'general', color: 'green' }
]

export const BugReportModal: React.FC<BugReportModalProps> = ({
  visible,
  onClose,
  initialError = null
}) => {
  const [form] = Form.useForm()
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false)
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)

  useEffect(() => {
    if (visible) {
      setSubmittedSuccessfully(false)
      analytics.getDiagnostics().then(setDiagnostics)

      form.setFieldsValue({
        category: initialError ? 'crash' : 'bug',
        title: initialError ? `Crash: ${initialError.message.slice(0, 60)}` : '',
        description: initialError
          ? `An unexpected error occurred while using Excited Gem.\n\nError Message: ${initialError.message}`
          : '',
        email: '',
        includeDiagnostics: true
      })
    }
  }, [visible, initialError, form])

  const buildPayload = (values: any): BugReportPayload => {
    return {
      category: values.category,
      title: values.title.trim(),
      description: values.description.trim(),
      email: values.email?.trim() || undefined,
      includeDiagnostics,
      diagnostics: includeDiagnostics && diagnostics ? diagnostics : undefined,
      errorLog: initialError
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setIsSubmitting(true)

      const payload = buildPayload(values)
      const res = await analytics.reportBug(payload)

      if (res.success) {
        setSubmittedSuccessfully(true)
        message.success('Thank you! Your feedback has been recorded.')
      } else {
        message.warning('Feedback saved locally. You can copy the report to GitHub.')
      }
    } catch (err: any) {
      if (err?.errorFields) {
        // Antd validation error, form highlights it
        return
      }
      console.error('Error submitting report:', err)
      message.error('Failed to submit report. Please copy the markdown to GitHub.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      const values = form.getFieldsValue()
      const payload = buildPayload({
        category: values.category || (initialError ? 'crash' : 'bug'),
        title: values.title || 'Bug Report',
        description: values.description || 'No description provided.',
        email: values.email
      })

      const markdown = analytics.formatReportMarkdown(payload)
      await navigator.clipboard.writeText(markdown)
      message.success('Report copied to clipboard in GitHub Markdown format!')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      message.error('Could not copy to clipboard.')
    }
  }

  const handleOpenGitHubIssues = () => {
    const values = form.getFieldsValue()
    const payload = buildPayload({
      category: values.category || (initialError ? 'crash' : 'bug'),
      title: values.title || 'Bug Report',
      description: values.description || 'No description provided.',
      email: values.email
    })

    const titleParam = encodeURIComponent(
      `[${payload.category.toUpperCase()}] ${payload.title || 'Issue'}`
    )
    const bodyParam = encodeURIComponent(analytics.formatReportMarkdown(payload))
    const githubUrl = `https://github.com/picwellwisher12pk/excited-gem/issues/new?title=${titleParam}&body=${bodyParam}`

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: githubUrl })
    } else {
      window.open(githubUrl, '_blank')
    }
    onClose()
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <Bug className="w-5 h-5 text-red-500" />
          <span>Report a Bug & Feedback</span>
        </div>
      }
      footer={
        submittedSuccessfully ? (
          <Button type="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <Space>
              <Button icon={<Copy className="w-4 h-4 inline mr-1" />} onClick={handleCopyToClipboard}>
                Copy as Markdown
              </Button>
              <Button
                icon={<ExternalLink className="w-4 h-4 inline mr-1" />}
                onClick={handleOpenGitHubIssues}
              >
                Open on GitHub
              </Button>
            </Space>
            <Space>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                type="primary"
                icon={<Send className="w-4 h-4 inline mr-1" />}
                loading={isSubmitting}
                onClick={handleSubmit}
              >
                Send Report
              </Button>
            </Space>
          </div>
        )
      }
      width={640}
      destroyOnClose
    >
      {submittedSuccessfully ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <Paragraph className="text-base font-medium text-gray-800">
            Thank you for helping improve Excited Gem!
          </Paragraph>
          <Paragraph className="text-sm text-gray-500 max-w-md mx-auto">
            Your telemetry and diagnostic payload have been logged. You can also view open
            issues and feature milestones on GitHub.
          </Paragraph>
        </div>
      ) : (
        <Form form={form} layout="vertical" className="mt-3">
          {initialError && (
            <Alert
              type="error"
              showIcon
              icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
              message="Application Crash Detected"
              description={
                <div className="text-xs font-mono break-all line-clamp-3">
                  {initialError.message}
                </div>
              }
              className="mb-4"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="category"
              label="Issue Category"
              rules={[{ required: true, message: 'Please select a category' }]}
            >
              <Select>
                {CATEGORY_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    <Tag color={opt.color} className="mr-1">
                      {opt.label}
                    </Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="email"
              label="Your Contact Email (Optional)"
              tooltip="Only used if we need more context to reproduce this bug."
            >
              <Input placeholder="you@example.com" />
            </Form.Item>
          </div>

          <Form.Item
            name="title"
            label="Summary / Title"
            rules={[{ required: true, message: 'Please provide a short summary' }]}
          >
            <Input placeholder="e.g., Video duration sort puts shorts into new window" />
          </Form.Item>

          <Form.Item
            name="description"
            label="What happened? Steps to reproduce:"
            rules={[{ required: true, message: 'Please explain what went wrong' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the issue, what you expected to happen, and steps to reproduce..."
            />
          </Form.Item>

          <Form.Item className="mb-2">
            <Checkbox
              checked={includeDiagnostics}
              onChange={(e) => setIncludeDiagnostics(e.target.checked)}
            >
              <span className="text-xs text-gray-600">
                Attach anonymous diagnostic stats (Extension v
                {diagnostics?.appVersion || '1.9.0'}, OS, Window & Tab counts)
              </span>
            </Checkbox>
          </Form.Item>

          {includeDiagnostics && diagnostics && (
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: 'diag',
                  label: (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> View Diagnostic Details
                    </span>
                  ),
                  children: (
                    <div className="bg-gray-50 p-2.5 rounded border border-gray-100 text-xs font-mono space-y-1 text-gray-600">
                      <div>Version: {diagnostics.appVersion}</div>
                      <div>Platform: {diagnostics.platform}</div>
                      <div>User Agent: {diagnostics.userAgent}</div>
                      <div>
                        Active Windows: {diagnostics.windowCount} | Active Tabs:{' '}
                        {diagnostics.tabCount}
                      </div>
                      <div>Timestamp: {diagnostics.timestamp}</div>
                    </div>
                  )
                }
              ]}
            />
          )}
        </Form>
      )}
    </Modal>
  )
}
export default BugReportModal
