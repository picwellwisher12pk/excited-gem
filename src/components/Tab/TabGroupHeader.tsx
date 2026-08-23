import {
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Eye,
  MinusCircle
} from 'lucide-react'
import { Button, Tooltip } from 'antd'
import React from 'react'

interface TabGroupHeaderProps {
  id: number
  title?: string
  color: string
  collapsed: boolean
  tabCount: number
  onToggle: () => void
  onSave: () => void
  onDiscard: () => void
  onClose: () => void
  onFocus: () => void
}

const colorMap: Record<string, string> = {
  grey: '#5f6368',
  blue: '#1a73e8',
  red: '#d93025',
  yellow: '#f9ab00',
  green: '#188038',
  pink: '#e52592',
  purple: '#9334e6',
  cyan: '#007b83',
  orange: '#fa903e'
}

export function TabGroupHeader({
  id,
  title,
  color,
  collapsed,
  tabCount,
  onToggle,
  onSave,
  onDiscard,
  onClose,
  onFocus
}: TabGroupHeaderProps) {
  return (
    <div
      className="flex items-center px-4 py-1.5 bg-slate-50 border-b border-stone-100 h-[40px] group hover:bg-slate-100 transition-colors select-none ml-4 border-l-4"
      style={{ borderLeftColor: colorMap[color] || color }}
    >
      <div
        className="flex items-center cursor-pointer mr-2 flex-1 min-w-0"
        onClick={onToggle}
      >
        <div className="mr-1 text-slate-400 flex-shrink-0">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </div>
        <span className="font-medium text-slate-900 text-sm px-2 whitespace-nowrap">
          {title && title.trim() !== '' ? title : `Group ${id}`}
        </span>
        <span className="ml-2 text-xs text-slate-400 flex-shrink-0">
          ({tabCount})
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip title="Focus Group">
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={onFocus}
            className="flex items-center justify-center w-6 h-6 min-w-0"
          />
        </Tooltip>
        <Tooltip title="Save Group">
          <Button
            type="text"
            size="small"
            icon={<Save size={14} />}
            onClick={onSave}
            className="flex items-center justify-center w-6 h-6 min-w-0"
          />
        </Tooltip>
        <Tooltip title="Discard Tabs">
          <Button
            type="text"
            size="small"
            icon={<MinusCircle size={14} />}
            onClick={onDiscard}
            className="flex items-center justify-center w-6 h-6 min-w-0"
          />
        </Tooltip>
        <Tooltip title="Close Group">
          <Button
            type="text"
            size="small"
            danger
            icon={<X size={14} />}
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 min-w-0"
          />
        </Tooltip>
      </div>
    </div>
  )
}
