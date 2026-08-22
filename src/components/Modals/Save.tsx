import { Button, Input, Modal, Select, List, Typography, Space, Avatar } from 'antd'
import { useState } from 'react'
import { useSelector } from 'react-redux'

import { saveSession } from '../getsetSessions'

const { Option } = Select
const { Text } = Typography

const children = []
export const SaveModal = (props) => {
  const { tabs } = useSelector((state: any) => state.tabs)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState([])

  const handleCancel = () => {
    props.setSaveModalVisible(false)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title")
      return
    }
    setLoading(true)
    try {
      const tabsToSave = props.selectedTabs.map(id => {
        const tab = tabs.find(t => t.id === id)
        return tab ? {
          url: tab.url,
          title: tab.title,
          windowId: tab.windowId || 0,
          favIconUrl: tab.favIconUrl
        } : null
      }).filter(Boolean)

      await saveSession(tabsToSave, title)
      props.setSaveModalVisible(false)
    } catch (error) {
      console.error("Failed to save session:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectedTabsData = props.selectedTabs.map(id => tabs.find(t => t.id === id)).filter(Boolean)

  return (
    <Modal
      title={`Save (${props.selectedTabs.length}) Tabs as List`}
      open={true}
      width={800}
      onOk={handleSave}
      onCancel={handleCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="primary" loading={loading} onClick={handleSave} disabled={!title.trim()}>
            Save List
          </Button>
        </div>
      }>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text strong>List Title</Text>
          <Input
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Research for Project X"
            autoFocus
          />
        </div>

        <div>
          <Text strong>Tags (Optional)</Text>
          <Select
            className="mt-1 w-full"
            mode="tags"
            placeholder="Add tags..."
            onChange={setTags}
            tokenSeparators={[',']}
          >
            {children}
          </Select>
        </div>

        <div>
          <Text strong>Tabs Preview</Text>
          <div className="mt-1 border rounded-md max-h-[50vh] overflow-y-auto bg-slate-50">
            <List
              size="small"
              dataSource={selectedTabsData}
              renderItem={(tab: any) => (
                <List.Item className="!px-2 !py-1 hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2 w-full overflow-hidden">
                    {tab.favIconUrl ?
                      <Avatar src={tab.favIconUrl} size={16} shape="square" className="flex-shrink-0" /> :
                      <Avatar size={16} shape="square" className="flex-shrink-0 text-[10px] flex items-center justify-center">{tab.title?.[0] || 'T'}</Avatar>
                    }
                    <div className="flex-1 min-w-0 flex flex-col">
                      <Text ellipsis className="text-xs font-medium leading-tight">{tab.title}</Text>
                      <Text type="secondary" ellipsis className="text-[10px] leading-tight">{tab.url}</Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        </div>
      </Space>
    </Modal>
  )
}
