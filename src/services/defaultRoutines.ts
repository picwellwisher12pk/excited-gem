import type { RoutinePreset } from '../types/routine'

export const DEFAULT_ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: 'preset-youtube-shorts',
    name: 'YouTube Shorts to New Window',
    description: 'Extracts all YouTube Shorts and media tabs from the current window and moves them into their own dedicated window.',
    icon: 'Layers',
    color: '#ef4444',
    category: 'workspace',
    routine: {
      name: 'YouTube Shorts to New Window',
      description: 'Extracts all YouTube Shorts and media tabs from the current window and moves them into their own dedicated window.',
      icon: 'Layers',
      color: '#ef4444',
      enabled: true,
      targetScope: 'active-window',
      triggers: {
        manual: true,
        onStartup: false,
        intervalMinutes: null
      },
      steps: [
        {
          id: 'step-yt-shorts-1',
          type: 'move-to-window',
          name: 'Move YouTube Shorts to New Window',
          enabled: true,
          params: {
            filterPattern: 'youtube.com/shorts',
            filterField: 'url',
            isRegex: false
          }
        },
        {
          id: 'step-yt-shorts-2',
          type: 'save-list',
          name: 'Backup Shorts to List',
          enabled: true,
          params: {
            filterPattern: 'youtube.com/shorts',
            sessionNameTemplate: 'YouTube Shorts - {date} {time}',
            closeAfterSave: false
          }
        }
      ]
    }
  },
  {
    id: 'preset-deep-clean',
    name: 'Deep Workspace Cleanup',
    description: 'Deduplicates tabs, mutes background audio, suspends inactive tabs, and auto-groups by domain.',
    icon: 'Sparkles',
    color: '#3b82f6',
    category: 'cleanup',
    routine: {
      name: 'Deep Workspace Cleanup',
      description: 'Deduplicates tabs, mutes background audio, suspends inactive tabs, and auto-groups by domain.',
      icon: 'Sparkles',
      color: '#3b82f6',
      enabled: true,
      targetScope: 'active-window',
      triggers: {
        manual: true,
        onStartup: false,
        intervalMinutes: null
      },
      steps: [
        {
          id: 'step-dedup-1',
          type: 'close-duplicates',
          name: 'Close Duplicate Tabs',
          enabled: true,
          params: {
            preferPinned: true,
            acrossAllWindows: false
          }
        },
        {
          id: 'step-mute-2',
          type: 'mute-tabs',
          name: 'Mute Background Audio',
          enabled: true,
          params: {
            muteScope: 'all-except-active'
          }
        },
        {
          id: 'step-discard-3',
          type: 'discard-tabs',
          name: 'Suspend Background Tabs (Free RAM)',
          enabled: true,
          params: {
            discardScope: 'all-background'
          }
        },
        {
          id: 'step-group-4',
          type: 'group-by-domain',
          name: 'Auto-Group by Domain',
          enabled: true,
          params: {
            minTabsPerGroup: 2
          }
        }
      ]
    }
  },
  {
    id: 'preset-focus-mode',
    name: 'Focus & Deep Work',
    description: 'Mutes all distractions, pins active work tab, and closes distracting social/media sites.',
    icon: 'Zap',
    color: '#8b5cf6',
    category: 'focus',
    routine: {
      name: 'Focus & Deep Work',
      description: 'Mutes all distractions, pins active work tab, and closes distracting social/media sites.',
      icon: 'Zap',
      color: '#8b5cf6',
      enabled: true,
      targetScope: 'active-window',
      triggers: {
        manual: true,
        onStartup: false,
        intervalMinutes: null
      },
      steps: [
        {
          id: 'step-focus-mute',
          type: 'mute-tabs',
          name: 'Mute All Tabs Except Active',
          enabled: true,
          params: {
            muteScope: 'all-except-active'
          }
        },
        {
          id: 'step-focus-close-distractions',
          type: 'close-tabs',
          name: 'Close Distraction Sites',
          enabled: true,
          params: {
            closeCondition: 'domain-list',
            domainList: [
              'twitter.com',
              'x.com',
              'facebook.com',
              'instagram.com',
              'reddit.com',
              'tiktok.com',
              'netflix.com'
            ]
          }
        },
        {
          id: 'step-focus-suspend',
          type: 'discard-tabs',
          name: 'Suspend Remaining Inactive Tabs',
          enabled: true,
          params: {
            discardScope: 'all-background'
          }
        }
      ]
    }
  },
  {
    id: 'preset-ram-saver',
    name: 'RAM Saver / Hibernate',
    description: 'Suspends all non-active background tabs across all windows to free up system memory immediately.',
    icon: 'Cpu',
    color: '#10b981',
    category: 'performance',
    routine: {
      name: 'RAM Saver / Hibernate',
      description: 'Suspends all non-active background tabs across all windows to free up system memory immediately.',
      icon: 'Cpu',
      color: '#10b981',
      enabled: true,
      targetScope: 'all-windows',
      triggers: {
        manual: true,
        onStartup: false,
        intervalMinutes: 30
      },
      steps: [
        {
          id: 'step-ram-discard',
          type: 'discard-tabs',
          name: 'Discard All Background Tabs',
          enabled: true,
          params: {
            discardScope: 'all-background'
          }
        }
      ]
    }
  },
  {
    id: 'preset-snapshot-close',
    name: 'Snapshot & Tidy Window',
    description: 'Saves the current window tabs into a timestamped Session and closes duplicates.',
    icon: 'Bookmark',
    color: '#f59e0b',
    category: 'workspace',
    routine: {
      name: 'Snapshot & Tidy Window',
      description: 'Saves the current window tabs into a timestamped Session and closes duplicates.',
      icon: 'Bookmark',
      color: '#f59e0b',
      enabled: true,
      targetScope: 'active-window',
      triggers: {
        manual: true,
        onStartup: false,
        intervalMinutes: null
      },
      steps: [
        {
          id: 'step-snap-save',
          type: 'save-session',
          name: 'Save Window as Session',
          enabled: true,
          params: {
            sessionNameTemplate: 'Auto Snapshot - {date} {time}',
            closeAfterSave: false
          }
        },
        {
          id: 'step-snap-dedup',
          type: 'close-duplicates',
          name: 'Close Duplicates',
          enabled: true,
          params: {
            preferPinned: true,
            acrossAllWindows: false
          }
        },
        {
          id: 'step-snap-group',
          type: 'group-by-domain',
          name: 'Group by Domain',
          enabled: true,
          params: {
            minTabsPerGroup: 2
          }
        }
      ]
    }
  },
  {
    id: 'preset-organize-sort',
    name: 'Organize & Sort Tabs',
    description: 'Sorts all tabs alphabetically by domain (pinned first) and auto-groups matching domains.',
    icon: 'Layers',
    color: '#06b6d4',
    category: 'workspace',
    routine: {
      name: 'Organize & Sort Tabs',
      description: 'Sorts all tabs alphabetically by domain (pinned first) and auto-groups matching domains.',
      icon: 'Layers',
      color: '#06b6d4',
      enabled: true,
      targetScope: 'active-window',
      triggers: {
        manual: true,
        onStartup: false,
        intervalMinutes: null
      },
      steps: [
        {
          id: 'step-sort-1',
          type: 'sort-tabs',
          name: 'Sort Tabs by Domain',
          enabled: true,
          params: {
            sortBy: 'domain',
            sortDirection: 'asc'
          }
        },
        {
          id: 'step-group-1',
          type: 'group-by-domain',
          name: 'Group Multi-tab Domains',
          enabled: true,
          params: {
            minTabsPerGroup: 2
          }
        }
      ]
    }
  }
]
