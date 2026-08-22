import { Dropdown, Select, Space } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { ReactNode } from 'react'
import {
  Pin,
  VolumeX,
  X,
  Move,
  Save,
  Moon,
  ChevronDown
} from 'lucide-react'

import logo from '~/assets/logo.svg'

import { getAllWindows, getCurrentWindow, processTabs } from '~/scripts/general'
import { clearSelectedTabs } from '~/store/tabSlice'
import { MoveModal } from '~/components/Modals/Move'
import { SaveModal } from '~/components/Modals/Save'
import WindowSelector from '~/components/WindowSelector'
import Brand from './Brand'
import Selection from './Selection'
import SortButton from './SortButton'
import Btn from '~/components/Btn'
import { SidebarToggleButton } from '~/components/Sidebar'
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

export default function Header({
  children,
  allSelected = false,
  allMuted = false,
  allPinned = false,
  processSelectedTabs = () => { },
  sidebarToggle
}: Readonly<HeaderProps>) {
  const dispatch = useDispatch()
  const { selectedTabs, tabs, filteredTabs } = useSelector((state: { tabs: TabState }) => state.tabs)
  const [checkedList, setCheckedList] = useState(selectedTabs)
  const [indeterminate, setIndeterminate] = useState(false)
  const [checkAll, setCheckAll] = useState(false)

  const [allWindows, setAllWindows] = useState([])
  const [currentWindow, setCurrentWindow] = useState({})
  const [moveModalVisible, setMoveModalVisible] = useState(false)
  const [saveModalVisible, setSaveModalVisible] = useState(false)

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

  // Replace Dropdown menus with Select components for pin and mute actions
  const pinMenu = {
    items: pinActions.map((action) => ({
      key: action,
      label: action,
    })),
    onClick: ({ key }) => handlePin(key),
  }

  const pinSelect = (
    <Dropdown menu={pinMenu} trigger={['click']}>
      <Btn className="mr-2 flex items-center">
        <Pin size={14} className="mr-1" />
        <span>Pin</span>
        <ChevronDown size={14} className="ml-2 text-zinc-500" />
      </Btn>
    </Dropdown>
  )

  const muteMenu = {
    items: muteActions.map((action) => ({
      key: action,
      label: action,
    })),
    onClick: ({ key }) => handleMute(key),
  }

  const muteSelect = (
    <Dropdown menu={muteMenu} trigger={['click']}>
      <Btn className="mr-2 flex items-center">
        <VolumeX size={14} className="mr-1" />
        <span>Mute</span>
        <ChevronDown size={14} className="ml-2 text-zinc-500" />
      </Btn>
    </Dropdown>
  )

  return (
    <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-1 transition-all duration-200 ease-in-out">
      <section className="flex w-full overflow-hidden items-center">
        <div className="flex-none flex items-center">
          {sidebarToggle && (
            <div className="mr-2">
              <SidebarToggleButton onClick={sidebarToggle} />
            </div>
          )}
          <div className="hidden sm:block">
            {Brand(logo)}
          </div>
        </div>
        {children}
      </section>
      <section
        className="flex flex-row justify-between items-center mt-1"
        id="selection-action">
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
          <Space>
            <span className="px-2 pl-0 text-white select-none font-semibold">
              Actions for selection ({selectedTabs.length} tabs)
            </span>
            <div>
              {pinSelect}
            </div>
            <div>
              {muteSelect}
            </div>
            <div>
              <Btn onClick={() => setSaveModalVisible(true)}>
                <Save size={14} className="inline mr-1" />
                <span> Save ...</span>
              </Btn>
            </div>
            <div>
              <Btn
                title="Move Selected Tabs"
                onClick={() => setMoveModalVisible(true)}
              >
                <Move size={14} className="mr-1" />
                <Space>
                  <span>Move ...</span>
                </Space>
              </Btn>
            </div>
            <div>
              <Btn
                title="Close Selected"
                onClick={() => {
                  processTabs('closeSelected', selectedTabs, tabs, () => {
                    dispatch(clearSelectedTabs())
                  })
                }}
              >
                <X size={14} className="mr-1 text-red-500" />
                <span> Close</span>
              </Btn>
            </div>
            <div>
              <Btn
                title="Discard Selected"
                onClick={() => {
                  processTabs('discardSelected', selectedTabs, tabs)
                }}
              >
                <Moon size={14} className="mr-1" />
                <span> Discard</span>
              </Btn>
            </div>
          </Space>
        )}


        <Space className="mr-1">
          <div>
            <MoreActionsMenu />
          </div>

          <div>
            <Btn
              onClick={() => {
                processSelectedTabs(!allMuted ? 'muteSelected' : 'unmuteSelected')
              }}
              title={!allMuted ? 'Mute All Visible Tabs' : 'Unmute All Visible Tabs'}>
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
      {saveModalVisible && (
        <SaveModal
          selectedTabs={selectedTabs}
          setSaveModalVisible={setSaveModalVisible}
        />
      )}
    </header>
  )
}
