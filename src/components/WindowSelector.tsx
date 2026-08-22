import {Select} from 'antd'
import {useEffect, useState} from 'react'
import {useDispatch, useSelector} from 'react-redux'

import {getAllWindows, getCurrentWindow} from '~/scripts/general'
import {updateSelectedWindow} from '~/store/tabSlice'

const {Option} = Select

export default function WindowSelector() {
  const dispatch = useDispatch()
  // const [dropdownVisible, setDropDown] = useState(false)
  const {selectedWindow} = useSelector((state) => state.tabs) //'current'
  const [allWindows, setAllWindows] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWindow, setCurrentWindow] = useState({})

  async function getWindows() {
    const allWindows = await getAllWindows()
    const currentWindow = await getCurrentWindow()
    setAllWindows(allWindows)
    setCurrentWindow(currentWindow)
    setLoading(false)
  }

  function optionCreator(window) {
    return (
      <Option
        key={window.id}
        value={window.id}
        label={window.id}
        onClick={() =>
          setWindow(currentWindow.id === window.id ? 'current' : window.id)
        }>
        <span
          className={`flex justify-between align-items-center btn-link`}
          onClick={() => {
            setWindow(window.id)
          }}>
          <div>
            <span
              className={
                'inline-block w-2 h-2 rounded-full mb-[1px] mr-2 ' +
                (currentWindow.id === window.id ? 'bg-green-500' : '')
              }></span>
            <span>
              Window
              {currentWindow.id === window.id && (
                <small className="text-gray-400"> (current)</small>
              )}
              <span className="sr-only">(current)</span>
            </span>
          </div>
          <small
            className={
              window.tabs.length > 50 ? '!text-orange-600' : '!text-lime-700'
            }>
            {window.tabs.length} tab{window.tabs.length > 1 && 's'}
          </small>
        </span>
      </Option>
    )
  }

  useEffect(() => {
    getWindows()
  }, [])
  const setWindow = (window) => {
    dispatch(updateSelectedWindow(window))
  }

  const totalTabCount = allWindows.reduce(function (total, window) {
    return total + window.tabs.length
  }, 0)
  const optionAll = (
    <Option value="all" label="all" key="all">
      <div className="flex justify-between">
        <div>
          <span
            className={
              'inline-block w-2 h-2 rounded-full mb-[1px] mr-2 ' +
              (currentWindow.id === window.id && 'bg-green-500')
            }></span>
          <span>All Windows</span>
        </div>
        <small
          className={
            totalTabCount > 50 ? '!text-orange-600' : '!text-green-500'
          }>
          {totalTabCount} tab{totalTabCount > 1 && 's'}
        </small>
      </div>
    </Option>
  )
  const optionCurrent = (
    <Option value="current" label="current" key="current">
      <div className="flex justify-between">
        <div>
          <span
            className={
              'inline-block w-2 h-2 rounded-full mb-[1px] mr-2 ' +
              (selectedWindow.id === window.id ? 'bg-green-500' : '')
            }></span>
          <span>
            Window <small className="text-gray-400"> (current)</small>
          </span>
        </div>
        <small
          className={
            currentWindow.tabs?.length > 50
              ? '!text-orange-600'
              : '!text-green-500'
          }>
          {currentWindow.tabs?.length} tab
          {currentWindow.tabs?.length > 1 && 's'}
        </small>
      </div>
    </Option>
  )

  const options = allWindows
    .filter((window) => currentWindow.id !== window.id)
    .map(optionCreator)

  if (allWindows.length <= 1) return null
  return (
    <Select
      loading={loading}
      style={{width: 200}}
      size={'small'}
      defaultValue={{
        value: selectedWindow
      }}
      className="!border-0 shadow-md hover:shadow-sm active:shadow-none"
      onSelect={setWindow}>
      {[optionAll, optionCurrent, ...options]}
    </Select>
  )
}
