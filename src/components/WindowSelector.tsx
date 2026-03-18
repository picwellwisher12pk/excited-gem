import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { getAllWindows, getCurrentWindow } from '../scripts/general'
import { updateSelectedWindow } from '../store/tabSlice'
import { ChevronDown } from 'lucide-react'
import Btn from '../components/Btn'

export default function WindowSelector() {
  const dispatch = useDispatch()
  const { selectedWindow } = useSelector((state) => state.tabs)
  const [allWindows, setAllWindows] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWindow, setCurrentWindow] = useState({})
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

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

  const setWindow = (window) => {
    dispatch(updateSelectedWindow(window))
    setIsOpen(false)
  }

  const totalTabCount = allWindows.reduce(function (total, window) {
    return total + window.tabs.length
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
    .filter((window) => currentWindow.id !== window.id)
    .map(window => ({
      key: window.id,
      label: `Window ${window.id}`,
      count: window.tabs.length,
      onClick: () => setWindow(window.id)
    }))

  if (allWindows.length <= 1) return null

  const getCurrentLabel = () => {
    if (selectedWindow === 'all') return 'All Windows'
    if (selectedWindow === 'current') return 'Window (current)'
    const window = allWindows.find(w => w.id === selectedWindow)
    return window ? `Window ${window.id}` : selectedWindow
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Btn
        className="flex items-center justify-between !border-0 shadow-md hover:shadow-sm active:shadow-none"
        style={{ width: 200 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{getCurrentLabel()}</span>
        <ChevronDown size={14} className="ml-2 text-zinc-500" />
      </Btn>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50" style={{ width: 200 }}>
          <div className="max-h-64 overflow-y-auto">
            {/* All Windows Option */}
            <div
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100"
              onClick={optionAll.onClick}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full mb-[1px] mr-2"></span>
                  <span>All Windows</span>
                </div>
                <small className={totalTabCount > 50 ? '!text-orange-600' : '!text-green-500'}>
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
                  <span className="inline-block w-2 h-2 rounded-full mb-[1px] mr-2 bg-green-500"></span>
                  <span>Window <small className="text-gray-400">(current)</small></span>
                </div>
                <small className={currentWindow.tabs?.length > 50 ? '!text-orange-600' : '!text-green-500'}>
                  {currentWindow.tabs?.length || 0} tab{(currentWindow.tabs?.length || 0) > 1 && 's'}
                </small>
              </div>
            </div>

            {/* Other Windows */}
            {options.map(option => (
              <div
                key={option.key}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={option.onClick}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full mb-[1px] mr-2"></span>
                    <span>Window {option.key}</span>
                  </div>
                  <small className={option.count > 50 ? '!text-orange-600' : '!text-lime-700'}>
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
