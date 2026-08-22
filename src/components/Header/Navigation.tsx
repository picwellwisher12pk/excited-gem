import { Badge } from 'antd'
import React, { memo } from 'react'

interface NavigationProps {
  tabCount?: number
}

const Navigation: React.FC<NavigationProps> = ({ tabCount = 0 }) => {
  return (
    <div className="flex-none hidden sm:block" id="navbarNav">
      <div className="flex justify-start w-auto mb-0">
        <div className="px-4 py-3">
          <Badge
            overflowCount={999}
            offset={[5, -3]}
            count={tabCount}
            color={tabCount > 50 ? 'orange' : 'green'}
            size="small"
            className="!border-0">
            <a
              className="text-white font-semibold hover:text-white"
              href="/tabs/home.html"
              id="go-to-tabs">
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
