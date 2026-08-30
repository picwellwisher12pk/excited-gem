import { StrictMode } from 'react'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import { AnalyticsDashboard } from '../components/Analytics/AnalyticsDashboard'
import store from '../store/store'

import 'antd/dist/reset.css'
import '../styles/index.css'
import '../styles/accessibility.css'

export default function AnalyticsPage() {
  return (
    <StrictMode>
      <Provider store={store}>
        <ConfigProvider
          theme={{
            token: {
              borderRadius: 4,
              borderRadiusSM: 4,
              borderRadiusLG: 4
            }
          }}
        >
          <AnalyticsDashboard />
        </ConfigProvider>
      </Provider>
    </StrictMode>
  )
}
