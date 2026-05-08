import { Select, Space } from 'antd'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { ReactNode } from 'react'
import {
  Pin,
  VolumeX,
  X,
  Move,
  Save,
  Moon,
  ChevronDown,
  Layers,
  XCircle
} from 'lucide-react'

import logo from '../../assets/logo.svg'

import { getAllWindows, getCurrentWindow, processTabs } from '../../scripts/general'
import { clearSelectedTabs } from '../../store/tabSlice'
import { MoveModal } from '../../components/Modals/Move'
import { SaveListModal } from '../../components/Modals/SaveListModal'
import WindowSelector from '../../components/WindowSelector'
import Brand from './Brand'
import Selection from './Selection'
import SortButton from './SortButton'
import Btn from '../../components/Btn'
import { SidebarToggleButton } from '../../components/Sidebar'
import MoreActionsMenu from './MoreActionsMenu'

const { Option } = Select

interface HeaderProps {
  children?: ReactNode
  allSelected?: boolean
  allMuted?: boolean
  allPinned?: boolean
  processSelectedTabs?: (action: string) => void
  sidebarToggle?: () => void
}

interface TabState {
  selectedTabs: string[]
  tabs: any[]
  filteredTabs: any[]
}

interface MenuItem {
  key: number
  label: ReactNode
}

const pinActions: string[] = ['toggle', 'pin', 'unpin']
const muteActions: string[] = ['toggle', 'mute', 'unmute']

// Custom Pin Dropdown Component
const PinDropdown = ({ handlePin }) => {
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
    console.log('PinDropdown clicked:', key)
    handlePin(key)
    setIsOpen(false)
  }

  const items = [
    { key: 'toggle', label: 'Toggle' },
    { key: 'pin', label: 'Pin All' },
    { key: 'unpin', label: 'Unpin All' }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <Btn
        className="flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Pin size={14} className="mr-1" />
        <span>Pin</span>
        <ChevronDown size={14} className="ml-2 text-zinc-500" />
      </Btn>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
          {items.map(item => (
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

// Custom Mute Dropdown Component
const MuteDropdown = ({ handleMute }) => {
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
    console.log('MuteDropdown clicked:', key)
    handleMute(key)
    setIsOpen(false)
  }

  const items = [
    { key: 'toggle', label: 'Toggle' },
    { key: 'mute', label: 'Mute All' },
    { key: 'unmute', label: 'Unmute All' }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <Btn
        className="flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <VolumeX size={14} className="mr-1" />
        <span>Mute</span>
        <ChevronDown size={14} className="ml-2 text-zinc-500" />
      </Btn>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
          {items.map(item => (
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

export default function Header({
  children,
  allSelected = false,
  allMuted = false,
  allPinned = false,
  processSelectedTabs = () => { },
  sidebarToggle,
  navigation
}: Readonly<HeaderProps & { navigation?: ReactNode }>) {
  const dispatch = useDispatch()
  const { selectedTabs, tabs, filteredTabs } = useSelector(
    (state: { tabs: TabState }) => state.tabs
  )
  const [checkedList, setCheckedList] = useState(selectedTabs)
  const [indeterminate, setIndeterminate] = useState(false)
  const [checkAll, setCheckAll] = useState(false)

  const [allWindows, setAllWindows] = useState([])
  const [currentWindow, setCurrentWindow] = useState({})
  const [moveModalVisible, setMoveModalVisible] = useState(false)
  const [saveListModalVisible, setSaveListModalVisible] = useState(false)

  async function getWindows() {
    setAllWindows(await getAllWindows())
    setCurrentWindow(await getCurrentWindow())
  }

  useEffect(() => {
    getWindows()
  }, [moveModalVisible])

  const iconPinned = allPinned && (
    <Pin size={16} className="text-white fill-white" />
  )
  const iconSound = <VolumeX size={16} />

  // Handlers for pin and mute actions using Select components
  const handlePin = useCallback(
    (value: string) => {
      processTabs(value, selectedTabs, tabs)
    },
    [selectedTabs, tabs]
  )

  const handleMute = useCallback(
    (value: string) => {
      processTabs(value, selectedTabs, tabs)
    },
    [selectedTabs, tabs]
  )

  const sortButton = useMemo(() => <SortButton tabs={tabs} />, [tabs])

  const pinSelect = (
    <PinDropdown handlePin={handlePin} />
  )

  const muteSelect = (
    <MuteDropdown handleMute={handleMute} />
  )

  return (
    <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-2 transition-all duration-200 ease-in-out">
      <section className="flex items-center justify-between gap-4 w-full">
        <div className="flex-none flex items-center shrink-0">
          {sidebarToggle && (
            <div className="mr-2">
              <SidebarToggleButton onClick={sidebarToggle} />
            </div>
          )}
          <div className="hidden sm:block">{Brand(logo)}</div>
          {navigation && <div className="ml-4 flex items-center">{navigation}</div>}
        </div>
        <div className="flex-1 flex justify-end items-center pr-2">
          <div className="w-full max-w-xl">
            {children}
          </div>
        </div>
      </section>
      <section
        className="flex flex-row justify-between items-center mt-1"
        id="selection-action"
      >
        <div className="flex mb-0 overflow-x-auto sm:overflow-visible no-scrollbar">
          <div className="mr-3 shrink-0">
            <Selection />
          </div>
          <div className="shrink-0 mr-3">{sortButton}</div>
          <div className="hidden sm:block">
            <WindowSelector />
          </div>
        </div>
        {selectedTabs.length > 0 && (
          <Space size="small" wrap>
            <span className="px-2 pl-0 text-white select-none font-semibold">
              Actions for selection ({selectedTabs.length} tabs)
            </span>
            {pinSelect}
            {muteSelect}
            <Btn
              title="Group Selected Tabs"
              onClick={() => {
                if (selectedTabs.length > 0) {
                  chrome.tabs.group({ tabIds: selectedTabs })
                }
              }}
            >
              <Layers size={14} className="inline mr-1" />
              <span>Group</span>
            </Btn>
            <Btn onClick={() => setSaveListModalVisible(true)}>
              <Save size={14} className="inline mr-1" />
              <span>Save as List...</span>
            </Btn>
            <Btn
              title="Move Selected Tabs"
              onClick={() => setMoveModalVisible(true)}
            >
              <Move size={14} className="mr-1" />
              <span>Move...</span>
            </Btn>
            <Btn
              title="Close Selected"
              onClick={() => {
                processTabs('closeSelected', selectedTabs, tabs, () => {
                  dispatch(clearSelectedTabs())
                })
              }}
            >
              <X size={14} className="mr-1 text-red-500" />
              <span>Close</span>
            </Btn>
            <Btn
              title="Discard Selected"
              onClick={() => processTabs('discardSelected', selectedTabs, tabs)}
            >
              <Moon size={14} className="mr-1" />
              <span>Discard</span>
            </Btn>
            <Btn
              title="Clear Selection"
              onClick={() => dispatch(clearSelectedTabs())}
            >
              <XCircle size={14} className="mr-1 text-gray-400" />
              <span>Clear</span>
            </Btn>
          </Space>
        )}
        <Space className="mr-1">
          <div>
            <MoreActionsMenu />
          </div>
          <div>
            <Btn
              onClick={() => {
                processSelectedTabs(
                  !allMuted ? 'muteSelected' : 'unmuteSelected'
                )
              }}
              title={
                !allMuted ? 'Mute All Visible Tabs' : 'Unmute All Visible Tabs'
              }
            >
              {iconSound}
            </Btn>
          </div>
        </Space>
      </section>
      {moveModalVisible && (
        <MoveModal
          selectedTabs={selectedTabs}
          windows={allWindows}
          currentWindow={currentWindow}
          setMoveModalVisible={setMoveModalVisible}
        />
      )}
      {saveListModalVisible && (
        <SaveListModal
          open={saveListModalVisible}
          selectedTabIds={selectedTabs}
          onClose={() => setSaveListModalVisible(false)}
        />
      )}
    </header>
  )
}
