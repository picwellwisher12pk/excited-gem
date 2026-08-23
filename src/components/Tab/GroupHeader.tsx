import {
  Layout,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Eye,
  MinusCircle
} from 'lucide-react'
import { Button, Tooltip } from 'antd'

interface GroupHeaderProps {
  windowId: number
  tabCount: number
  isCurrentWindow: boolean
  collapsed: boolean
  onToggle: () => void
  onSave: () => void
  onDiscard: () => void
  onClose: () => void
  onFocus: () => void
}

export function GroupHeader({
  windowId,
  tabCount,
  isCurrentWindow,
  collapsed,
  onToggle,
  onSave,
  onDiscard,
  onClose,
  onFocus
}: GroupHeaderProps) {
  return (
    <div
      className="flex items-center px-4 py-2 bg-slate-100 border-b border-stone-200 h-[50px] cursor-pointer hover:bg-slate-200 transition-colors select-none group"
      onClick={onToggle}
    >
      <div className="mr-2 text-slate-500">
        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </div>
      <Layout size={16} className="text-slate-500 mr-2" />
      <span className="font-semibold text-slate-700 text-sm mr-2">
        Window {windowId}
        {isCurrentWindow && (
          <span className="text-slate-400 font-normal ml-2">(Current)</span>
        )}
      </span>
      <span className="text-xs text-slate-400">({tabCount})</span>

      <div
        className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip title="Focus Window">
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={onFocus}
            className="flex items-center justify-center w-6 h-6 min-w-0"
          />
        </Tooltip>
        <Tooltip title="Save Window">
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
        <Tooltip title="Close Window">
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
