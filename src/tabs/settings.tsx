import React, { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import {
  Radio,
  Space,
  Typography,
  message,
  ConfigProvider,
  Checkbox,
  Input,
  Button,
  Divider,
  Menu,
  Card,
} from 'antd'
import {
  KeyOutlined,
  BlockOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  GoogleOutlined,
  CloudSyncOutlined,
  CloudDownloadOutlined,
  ExperimentOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { loginAndGetProfile, logout } from '../utils/auth'
import type { UserProfile } from '../utils/auth'
import { backupToDrive, restoreFromDrive } from '../utils/drive'
import Sidebar, { SidebarToggleButton } from '../components/Sidebar'
import Brand from '../components/Header/Brand'
import logo from '../assets/logo.svg'
import store from '../store/store'
import { usePageTracking } from '../components/Analytics/usePageTracking'
import { useDispatch, useSelector } from 'react-redux'
import { toggleSearchIn, setRegex, } from '../store/searchSlice'
import { loadAISettings } from '../store/aiSlice'
import type { AppDispatch } from '../store/store'
import { AISettingsPanel } from '../components/AI/AISettingsPanel'
import RoutinesManager from '../components/Routines/RoutinesManager'
import 'antd/dist/reset.css'
import '../styles/index.css'

const { Title, Text } = Typography
const browser = chrome

const SETTINGS_CATEGORIES = [
  { key: 'display', label: 'Display Settings', icon: <BlockOutlined /> },
  { key: 'routines', label: 'Routines & Macros', icon: <ThunderboltOutlined /> },
  { key: 'integrations', label: 'Integrations & Sync', icon: <SyncOutlined /> },
  { key: 'search', label: 'Search Settings', icon: <SearchOutlined /> },
  { key: 'ai', label: 'AI Assistant', icon: <ExperimentOutlined /> },
  { key: 'about', label: 'About', icon: <InfoCircleOutlined /> }
]

function SettingsPageContent() {
  const dispatch = useDispatch<AppDispatch>()
  const { regex, searchIn } = useSelector((state: any) => state.search)
  const [sessionsView, setSessionsView] = useState<'compact' | 'expanded'>(
    'compact'
  )
  const [displayMode, setDisplayMode] = useState<'sidebar' | 'tab' | 'popup'>(
    'tab'
  )
  const [activeCategory, setActiveCategory] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    return SETTINGS_CATEGORIES.some(c => c.key === hash) ? hash : 'display'
  })
  const [tabManagementMode, setTabManagementMode] = useState<
    'single' | 'per-window'
  >('single')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [searchBehavior, setSearchBehavior] = useState<'debounce' | 'enter'>(
    'debounce'
  )
  const [groupedTabs, setGroupedTabs] = useState(true)
  const [tabActionButtons, setTabActionButtons] = useState<'always' | 'hover'>(
    'hover'
  )
  const [youtubeApiKey, setYoutubeApiKey] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  usePageTracking('/settings', 'Settings')

  useEffect(() => {
    dispatch(loadAISettings() as any)
    browser.storage.local.get(
      [
        'sessionsView',
        'displayMode',
        'tabManagementMode',
        'searchBehavior',
        'groupedTabs',
        'tabActionButtons',
        'youtubeApiKey',
        'userProfile',
        'regex',
        'searchIn'
      ],
      (result) => {
        if (result.regex !== undefined) dispatch(setRegex(result.regex))
        if (result.searchIn) dispatch(toggleSearchIn(result.searchIn))
        if (result.sessionsView) setSessionsView(result.sessionsView)
        if (result.displayMode) setDisplayMode(result.displayMode)
        if (result.tabManagementMode)
          setTabManagementMode(result.tabManagementMode)
        if (result.searchBehavior) setSearchBehavior(result.searchBehavior)
        if (result.groupedTabs !== undefined) setGroupedTabs(result.groupedTabs)
        if (result.tabActionButtons)
          setTabActionButtons(result.tabActionButtons)
        if (result.youtubeApiKey) setYoutubeApiKey(result.youtubeApiKey)
        if (result.userProfile) setUserProfile(result.userProfile)
      }
    )

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (SETTINGS_CATEGORIES.some(c => c.key === hash)) {
        setActiveCategory(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Update hash when category changes
  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeCategory) {
      window.location.hash = activeCategory
    }
  }, [activeCategory])

  const handleSearchBehaviorChange = (value: 'debounce' | 'enter') => {
    setSearchBehavior(value)
    browser.storage.local.set({ searchBehavior: value }, () => {
      message.success('Search behavior saved')
    })
  }

  const handleSessionsViewChange = (value: 'compact' | 'expanded') => {
    setSessionsView(value)
    browser.storage.local.set({ sessionsView: value }, () => {
      message.success('Settings saved')
    })
  }

  const handleDisplayModeChange = (value: 'sidebar' | 'tab' | 'popup') => {
    setDisplayMode(value)
    browser.storage.local.set({ displayMode: value }, () => {
      message.success('Display mode saved')
    })
  }

  const handleTabManagementModeChange = (value: 'single' | 'per-window') => {
    setTabManagementMode(value)
    browser.storage.local.set({ tabManagementMode: value }, () => {
      message.success('Tab management mode saved')
    })
  }

  const handleGroupedTabsChange = (value: boolean) => {
    setGroupedTabs(value)
    browser.storage.local.set({ groupedTabs: value }, () => {
      message.success('Grouped tabs setting saved')
    })
  }

  const handleTabActionButtonsChange = (value: 'always' | 'hover') => {
    setTabActionButtons(value)
    browser.storage.local.set({ tabActionButtons: value }, () => {
      message.success('Tab action buttons setting saved')
    })
  }

  const handleYoutubeApiKeyChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value
    setYoutubeApiKey(val)
    browser.storage.local.set({ youtubeApiKey: val }, () => {
      message.success('YouTube API Key saved')
    })
  }

  const handleRegexChange = (value: boolean) => {
    dispatch(setRegex(value))
    browser.storage.local.set({ regex: value }, () => {
      message.success('Regex search setting saved')
    })
  }

  const handleSearchInChange = (newSearchIn: any) => {
    dispatch(toggleSearchIn(newSearchIn))
    browser.storage.local.set({ searchIn: newSearchIn }, () => {
      message.success('Search criteria saved')
    })
  }

  const handleLogin = async () => {
    try {
      const { profile } = await loginAndGetProfile()
      setUserProfile(profile)
      browser.storage.local.set({ userProfile: profile })
      message.success('Successfully logged in')
    } catch (err) {
      message.error('Login failed')
    }
  }

  const handleLogout = async () => {
    await logout()
    setUserProfile(null)
    browser.storage.local.remove('userProfile')
    message.success('Logged out')
  }

  const handleBackup = async () => {
    setIsBackingUp(true)
    try {
      const data = await browser.storage.local.get(null)
      await backupToDrive(data)
      message.success('Successfully backed up to Google Drive')
    } catch (err) {
      message.error('Backup failed')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const data = await restoreFromDrive()
      if (data) {
        await browser.storage.local.set(data)
        message.success('Successfully restored from Google Drive')
      } else {
        message.info('No backup found')
      }
    } catch (err) {
      message.error('Restore failed')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="flex h-[100vh] relative overflow-hidden">
      <Sidebar
        currentPage="settings"
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex flex-col flex-1">
        <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-2 transition-all duration-200 ease-in-out">
          <section className="flex items-center">
            <div className="mr-2">
              <SidebarToggleButton
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>
            {Brand(logo)}
            <div className="flex items-center ml-4">
              <span className="text-white font-semibold text-lg">Settings</span>
            </div>
            <div className="flex-1" />
          </section>
        </header>

        <div className="flex-1 flex overflow-hidden bg-gray-50">
          {/* Settings Sidebar */}
          <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
            <div className="p-6 border-b border-gray-200">
              <Title level={4} className="!mb-0">Settings</Title>
              <Text type="secondary" className="text-xs">Customize your experience</Text>
            </div>
            <Menu
              mode="inline"
              selectedKeys={[activeCategory]}
              onClick={({ key }) => setActiveCategory(key)}
              items={SETTINGS_CATEGORIES}
              className="border-none py-2"
              style={{ width: '100.2%' }}
            />
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 overflow-auto p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
              {/* Category Breadcrumb/Header for Mobile */}
              <div className="md:hidden mb-6">
                <Menu
                  mode="horizontal"
                  selectedKeys={[activeCategory]}
                  onClick={({ key }) => setActiveCategory(key)}
                  items={SETTINGS_CATEGORIES}
                  className="bg-transparent border-b border-gray-200 mb-4"
                />
              </div>

              {/* Display card based on active category */}
              {activeCategory === 'routines' ? (
                <RoutinesManager />
              ) : (
                <Card
                  className="shadow-sm border-gray-200 !rounded-lg overflow-hidden"
                  title={
                    <div className="py-2">
                      <Title level={4} className="!mb-0">
                        {SETTINGS_CATEGORIES.find(c => c.key === activeCategory)?.label}
                      </Title>
                    </div>
                  }
                >
                {activeCategory === 'display' && (
                  <Space direction="vertical" size="large" className="w-full">
                    <div>
                      <Text strong>Extension Display Mode</Text>
                      <div className="mt-2">
                        <Radio.Group
                          value={displayMode}
                          onChange={(e) => handleDisplayModeChange(e.target.value)}
                        >
                          <Space direction="vertical">
                            <Radio value="sidebar">
                              <div>
                                <div className="font-medium">Sidebar</div>
                                <Text type="secondary" className="text-xs">
                                  Open in browser sidebar
                                </Text>
                              </div>
                            </Radio>
                            <Radio value="tab">
                              <div>
                                <div className="font-medium">Tab</div>
                                <Text type="secondary" className="text-xs">
                                  Open in a new tab
                                </Text>
                              </div>
                            </Radio>
                            <Radio value="popup">
                              <div>
                                <div className="font-medium">Popup</div>
                                <Text type="secondary" className="text-xs">
                                  Open as a popup
                                </Text>
                              </div>
                            </Radio>
                          </Space>
                        </Radio.Group>
                      </div>
                    </div>

                    {displayMode === 'tab' && (
                      <div>
                        <Text strong>Tab Management Mode</Text>
                        <div className="mt-2">
                          <Radio.Group
                            value={tabManagementMode}
                            onChange={(e) =>
                              handleTabManagementModeChange(e.target.value)
                            }
                          >
                            <Space direction="vertical">
                              <Radio value="single">
                                <div>
                                  <div className="font-medium">
                                    Single Extension Tab
                                  </div>
                                  <Text type="secondary" className="text-xs">
                                    Maintain one extension tab across all windows
                                  </Text>
                                </div>
                              </Radio>
                              <Radio value="per-window">
                                <div>
                                  <div className="font-medium">Per Window</div>
                                  <Text type="secondary" className="text-xs">
                                    Allow one extension tab per browser window
                                  </Text>
                                </div>
                              </Radio>
                            </Space>
                          </Radio.Group>
                        </div>
                      </div>
                    )}

                    <div>
                      <Text strong>Sessions View Mode</Text>
                      <div className="mt-2">
                        <Radio.Group
                          value={sessionsView}
                          onChange={(e) => handleSessionsViewChange(e.target.value)}
                        >
                          <Space direction="vertical">
                            <Radio value="compact">
                              <div>
                                <div className="font-medium">Compact</div>
                                <Text type="secondary" className="text-xs">
                                  Single-line view with expand option (recommended)
                                </Text>
                              </div>
                            </Radio>
                            <Radio value="expanded">
                              <div>
                                <div className="font-medium">Expanded</div>
                                <Text type="secondary" className="text-xs">
                                  Show all tabs by default
                                </Text>
                              </div>
                            </Radio>
                          </Space>
                        </Radio.Group>
                      </div>
                    </div>
                    <div>
                      <Text strong>Group Tabs by Window</Text>
                      <div className="mt-2">
                        <Radio.Group
                          value={groupedTabs}
                          onChange={(e) => handleGroupedTabsChange(e.target.value)}
                        >
                          <Space direction="vertical">
                            <Radio value={true}>
                              <div>
                                <div className="font-medium">Enabled</div>
                                <Text type="secondary" className="text-xs">
                                  Group tabs by window when "All windows" is
                                  selected
                                </Text>
                              </div>
                            </Radio>
                            <Radio value={false}>
                              <div>
                                <div className="font-medium">Disabled</div>
                                <Text type="secondary" className="text-xs">
                                  Show tabs as a flat list
                                </Text>
                              </div>
                            </Radio>
                          </Space>
                        </Radio.Group>
                      </div>
                    </div>
                    <div>
                      <Text strong>Tab Action Buttons</Text>
                      <div className="mt-2">
                        <Radio.Group
                          value={tabActionButtons}
                          onChange={(e) =>
                            handleTabActionButtonsChange(e.target.value)
                          }
                        >
                          <Space direction="vertical">
                            <Radio value="hover">
                              <div>
                                <div className="font-medium">On Hover</div>
                                <Text type="secondary" className="text-xs">
                                  Show buttons only when hovering over the tab
                                </Text>
                              </div>
                            </Radio>
                            <Radio value="always">
                              <div>
                                <div className="font-medium">Always Visible</div>
                                <Text type="secondary" className="text-xs">
                                  Always show action buttons
                                </Text>
                              </div>
                            </Radio>
                          </Space>
                        </Radio.Group>
                      </div>
                    </div>
                  </Space>
                )}

                {activeCategory === 'integrations' && (
                  <Space direction="vertical" size="large" className="w-full">
                    <div>
                      <Text strong>Google Account Sync</Text>
                      <div className="mt-2">
                        {userProfile ? (
                          <Space direction="vertical" className="w-full">
                            <div className="flex items-center gap-3 p-3 bg-white rounded border border-gray-200">
                              <img
                                src={userProfile.picture}
                                alt="Profile"
                                className="w-10 h-10 rounded-full"
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {userProfile.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {userProfile.email}
                                </div>
                              </div>
                              <Button onClick={handleLogout} size="small">
                                Sign Out
                              </Button>
                            </div>
                            <Space className="mt-2 text-white">
                              <Button
                                icon={<CloudSyncOutlined />}
                                onClick={handleBackup}
                                loading={isBackingUp}
                                type="primary"
                              >
                                Backup Settings & Sessions
                              </Button>
                              <Button
                                icon={<CloudDownloadOutlined />}
                                onClick={handleRestore}
                                loading={isRestoring}
                              >
                                Restore from Backup
                              </Button>
                            </Space>
                          </Space>
                        ) : (
                          <Button icon={<GoogleOutlined />} onClick={handleLogin}>
                            Sign in with Google
                          </Button>
                        )}
                        <div className="mt-2">
                          <Text type="secondary" className="text-xs">
                            Securely back up your saved tabs and settings to your
                            Google Drive.
                          </Text>
                        </div>
                      </div>
                    </div>
                    <Divider className="my-2" />
                    <div>
                      <Text strong>YouTube API Key (Optional BYOK)</Text>
                      <div className="mt-2">
                        <Input.Password
                          prefix={<KeyOutlined className="text-gray-400" />}
                          placeholder="AIzaSy..."
                          value={youtubeApiKey}
                          onChange={handleYoutubeApiKeyChange}
                        />
                        <div className="mt-2">
                          <Text type="secondary" className="text-xs">
                            Provide your own Google Cloud YouTube Data API v3 key to
                            enable rich data fetching for unloaded YouTube tabs.
                            <a
                              href="https://developers.google.com/youtube/v3/getting-started"
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1 text-blue-500 hover:underline"
                            >
                              Learn how to get one
                            </a>
                            .
                          </Text>
                        </div>
                      </div>
                    </div>
                  </Space>
                )}

                {activeCategory === 'search' && (
                  <Space direction="vertical" size="large" className="w-full">
                    <div>
                      <Text strong>Search Behavior</Text>
                      <div className="mt-2">
                        <Radio.Group
                          value={searchBehavior}
                          onChange={(e) =>
                            handleSearchBehaviorChange(e.target.value)
                          }
                        >
                          <Space direction="vertical">
                            <Radio value="debounce">
                              <div>
                                <div className="font-medium">As you type</div>
                                <Text type="secondary" className="text-xs">
                                  Search automatically while typing (debounced)
                                </Text>
                              </div>
                            </Radio>
                            <Radio value="enter">
                              <div>
                                <div className="font-medium">On Enter</div>
                                <Text type="secondary" className="text-xs">
                                  Search only when pressing Enter
                                </Text>
                              </div>
                            </Radio>
                          </Space>
                        </Radio.Group>
                      </div>
                    </div>
                    <div>
                      <Text strong>Search in</Text>
                      <div className="mt-2">
                        <Space>
                          <Checkbox
                            checked={searchIn.title}
                            onChange={() =>
                              handleSearchInChange({
                                ...searchIn,
                                title: !searchIn.title
                              })
                            }
                          >
                            Title
                          </Checkbox>
                          <Checkbox
                            checked={searchIn.url}
                            onChange={() =>
                              handleSearchInChange({
                                ...searchIn,
                                url: !searchIn.url
                              })
                            }
                          >
                            URL
                          </Checkbox>
                        </Space>
                      </div>
                    </div>
                    <div>
                      <Text strong>Regular Expression Search</Text>
                      <div className="mt-2">
                        <Space>
                          <Radio.Group
                            value={regex}
                            onChange={(e) => handleRegexChange(e.target.value)}
                          >
                            <Radio value={true}>Enabled</Radio>
                            <Radio value={false}>Disabled</Radio>
                          </Radio.Group>
                        </Space>
                      </div>
                    </div>
                  </Space>
                )}

                {activeCategory === 'ai' && (
                  <AISettingsPanel />
                )}


                {activeCategory === 'about' && (
                  <Space direction="vertical" className="w-full" size="middle">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                        <img src={logo} alt="Excited Gem" className="w-10 h-10 invert opacity-90" />
                      </div>
                      <div>
                        <Title level={4} className="!mb-0">Excited Gem</Title>
                        <Text type="secondary" className="text-sm">Version {browser.runtime.getManifest().version}</Text>
                      </div>
                    </div>
                    <div>
                      <Text className="text-gray-600 block mb-4">
                        A powerful tab management extension for Browser, designed to help you stay organized and focused.
                      </Text>
                      <Divider className="my-4" />
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <Text strong className="block mb-2 text-xs uppercase tracking-wider text-gray-400">
                          Privacy Notice
                        </Text>
                        <Text type="secondary" className="text-sm">
                          This extension collects anonymous usage analytics to help improve the product. No personal information is collected.
                        </Text>
                      </div>
                    </div>
                  </Space>
                )}
              </Card>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
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
        <SettingsPageContent />
      </ConfigProvider>
    </Provider>
  )
}
