import { Provider } from 'react-redux'
import ActiveTabs from '../scripts/ActiveTabs'
import store from '../store/store'

import 'antd/dist/reset.css'
import '../styles/index.css'
import '../styles/accessibility.css'
import { StrictMode } from 'react'
import { ConfigProvider } from 'antd'

import { CrashBoundary } from '../components/Feedback/CrashBoundary'

function Home() {
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
          <CrashBoundary>
            <ActiveTabs />
          </CrashBoundary>
        </ConfigProvider>
      </Provider>
    </StrictMode>
  )
}

export default Home
