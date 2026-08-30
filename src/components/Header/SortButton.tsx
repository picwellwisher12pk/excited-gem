import { DownOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
//@ts-ignore
import { sortTabs } from '../../scripts/general'
import { ArrowDownWideNarrow } from 'lucide-react'
import Btn from '../../components/Btn'

const SortButton = ({ tabs }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const onClick = (key) => {
    console.log('SortButton clicked:', key)
    sortTabs(key, tabs)
    setIsOpen(false)
  }

  const items = [
    { key: 'title', label: 'By Title' },
    { key: 'url', label: 'By URL' }
  ]

  return (
    <div className="relative mr-3" ref={dropdownRef}>
      <Btn
        className="flex items-center gap-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <ArrowDownWideNarrow size={14} className="text-zinc-600" />
        <span className="hidden sm:inline">Sort Tabs</span>
        <DownOutlined style={{ fontSize: 12, color: '#bfbfbf' }} />
      </Btn>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
          {items.map((item) => (
            <div
              key={item.key}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => onClick(item.key)}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export default SortButton
