import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getAllWindows, getCurrentWindow } from '../scripts/general'
import { updateSelectedWindow } from '../store/tabSlice'
import { ChevronDown } from 'lucide-react'
import Btn from '../components/Btn'

export default function WindowSelector() {
  const dispatch = useDispatch()
  const { selectedWindow } = useSelector((state: any) => state.tabs)
  const [allWindows, setAllWindows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWindow, setCurrentWindow] = useState<any>({})
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function getWindows() {
    const allWindows = await getAllWindows()
    const currentWindow = await getCurrentWindow()
    setAllWindows(allWindows)
    setCurrentWindow(currentWindow)
    setLoading(false)
  }

  useEffect(() => {
    getWindows()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  const setWindow = (win: any) => {
    dispatch(updateSelectedWindow(win))
    setIsOpen(false)
  }

  const totalTabCount = allWindows.reduce(function (total, win) {
    return total + (win.tabs?.length || 0)
  }, 0)

  const optionAll = {
    key: 'all',
    label: 'All Windows',
    count: totalTabCount,
    onClick: () => setWindow('all')
  }

  const optionCurrent = {
    key: 'current',
    label: 'Window (current)',
    count: currentWindow.tabs?.length || 0,
    onClick: () => setWindow('current')
  }

  const options = allWindows
    .filter((win) => currentWindow.id !== win.id)
    .map((win) => ({
      key: win.id,
      label: 'Window',
      count: win.tabs?.length || 0,
      onClick: () => setWindow(win.id)
    }))

  if (allWindows.length <= 1) return null

  const getCurrentDisplay = () => {
    if (selectedWindow === 'all') {
      return {
        label: 'All Windows',
        count: totalTabCount,
        isCurrent: false
      }
    }
    if (selectedWindow === 'current') {
      return {
        label: 'Window',
        count: currentWindow.tabs?.length || 0,
        isCurrent: true
      }
    }
    const win = allWindows.find((w) => w.id === selectedWindow)
    return win
      ? {
          label: 'Window',
          count: win.tabs?.length || 0,
          isCurrent: false
        }
      : {
          label: selectedWindow,
          count: 0,
          isCurrent: false
        }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Btn
        className="flex items-center justify-between !border-0 shadow-md hover:shadow-sm active:shadow-none px-3 py-2"
        style={{ width: 200 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center flex-1">
          <div className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full mb-[1px] mr-2" />
            <span>
              {getCurrentDisplay().label}
              {getCurrentDisplay().isCurrent && (
                <small className="text-gray-400 ml-1">(current)</small>
              )}
            </span>
          </div>
          <small
            className={`${
              getCurrentDisplay().count > 50
                ? '!text-orange-600'
                : '!text-green-500'
            }`}
          >
            {getCurrentDisplay().count} tab
            {getCurrentDisplay().count !== 1 && 's'}
          </small>
        </div>
        <ChevronDown size={14} className="ml-2 text-zinc-500 flex-shrink-0" />
      </Btn>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
          style={{ width: 200 }}
        >
          <div className="max-h-64 overflow-y-auto">
            {/* All Windows Option */}
            <div
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100"
              onClick={optionAll.onClick}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full mb-[1px] mr-2" />
                  <span>All Windows</span>
                </div>
                <small
                  className={
                    totalTabCount > 50
                      ? '!text-orange-600'
                      : '!text-green-500'
                  }
                >
                  {totalTabCount} tab{totalTabCount > 1 && 's'}
                </small>
              </div>
            </div>

            {/* Current Window Option */}
            <div
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100"
              onClick={optionCurrent.onClick}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full mb-[1px] mr-2 bg-green-500" />
                  <span>
                    Window <small className="text-gray-400">(current)</small>
                  </span>
                </div>
                <small
                  className={
                    (currentWindow.tabs?.length || 0) > 50
                      ? '!text-orange-600'
                      : '!text-green-500'
                  }
                >
                  {currentWindow.tabs?.length || 0} tab
                  {(currentWindow.tabs?.length || 0) > 1 && 's'}
                </small>
              </div>
            </div>

            {/* Other Windows */}
            {options.map((option) => (
              <div
                key={option.key}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={option.onClick}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full mb-[1px] mr-2" />
                    <span>Window</span>
                  </div>
                  <small
                    className={
                      option.count > 50
                        ? '!text-orange-600'
                        : '!text-lime-700'
                    }
                  >
                    {option.count} tab{option.count > 1 && 's'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
