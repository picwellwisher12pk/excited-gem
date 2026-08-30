import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import BookmarksMain from '../components/Bookmarks/BookmarksMain'
import store from '../store/store'

import 'antd/dist/reset.css'
import '../styles/index.css'

const root = createRoot(document.getElementById('root') as HTMLElement)

root.render(
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
        <BookmarksMain />
      </ConfigProvider>
    </Provider>
  </StrictMode>
)
