import { Badge } from 'antd'
import { memo } from 'react'
import { useSelector } from 'react-redux'

const Navigation = ({ tabCount }) => {
  const { selectedWindow, tabs } = useSelector((state) => state.tabs)

  // Show current window tab count if 'current' is selected, otherwise show total filtered tabs
  const displayTabCount = selectedWindow === 'current'
    ? tabs.filter(tab => tab.windowId === chrome.windows?.WINDOW_ID_CURRENT).length
    : tabCount

  console.log('navigation', { tabCount, displayTabCount, selectedWindow })
  return (
    <div className="flex-none hidden sm:block" id="navbarNav">
      <div className="flex justify-start w-auto mb-0">
        <div className="px-4 py-3">
          <Badge
            overflowCount={999}
            offset={[5, -3]}
            count={displayTabCount}
            color={displayTabCount > 50 ? 'orange' : 'green '}
            size="small"
            className="!border-0"
          >
            <a
              className=" text-white font-weight-bold"
              href="/tabs/home.html"
              id="go-to-tabs"
            >
              Tabs
              <span className="sr-only">(current)</span>
            </a>
          </Badge>
        </div>
      </div>
    </div>
  )
}

export default memo(Navigation)
