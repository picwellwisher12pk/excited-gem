import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Youtube, Key, RotateCw, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { message, notification } from 'antd'
import { desktopYoutubeService } from '../../services/desktopYoutubeService'
import { getBrowserAdapter } from '../../../../src/adapter'

interface YoutubeSettingsSectionProps {
  isDark: boolean
}

export const YoutubeSettingsSection: React.FC<YoutubeSettingsSectionProps> = ({ isDark }) => {
  const [apiKey, setApiKey] = useState(() => desktopYoutubeService.getApiKey())
  const [isSaved, setIsSaved] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [, setRefreshNonce] = useState(0)

  useEffect(() => {
    return desktopYoutubeService.subscribe(() => {
      setApiKey(desktopYoutubeService.getApiKey())
      setRefreshNonce((n) => n + 1)
    })
  }, [])

  const handleSaveApiKey = () => {
    desktopYoutubeService.setApiKey(apiKey)
    setIsSaved(true)
    message.success('YouTube API Key saved successfully')
    setTimeout(() => setIsSaved(false), 2500)
  }

  const handleSyncFromExtension = () => {
    setIsSyncing(true)
    try {
      const adapter = getBrowserAdapter()
      if (adapter && 'requestYoutubeCache' in adapter) {
        ;(adapter as any).requestYoutubeCache()
      }
      if (adapter && 'fetchYoutubeDurations' in adapter) {
        ;(adapter as any).fetchYoutubeDurations()
      }
      message.success('Requested YouTube cache and durations from browser extension')
    } catch (e) {
      console.warn('Error requesting YouTube cache:', e)
    } finally {
      setTimeout(() => setIsSyncing(false), 1000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm flex flex-col gap-4 ${
        isDark ? 'bg-[#222222]/70 border-[#333333]' : 'bg-white/80 border-[#e5e5e5]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500">
            <Youtube className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold m-0">YouTube Video Duration Sync & API</h3>
            <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
              Fetch video durations directly from YouTube Data API v3 or sync cached times from your browser extension.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncFromExtension}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
            isDark
              ? 'bg-[#2a2a2a] hover:bg-[#333333] border-[#3a3a3a] text-[#cccccc]'
              : 'bg-[#f5f5f5] hover:bg-[#eeeeee] border-[#dcdcdc] text-[#333333]'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-red-500' : ''}`} />
          <span>Sync from Extension</span>
        </button>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <label className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-[#aaaaaa]' : 'text-[#555555]'}`}>
          <Key className="w-3.5 h-3.5 text-red-500" />
          <span>YouTube Data API v3 Key (Optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder="AIzaSy... (leave blank to auto-sync from extension or use public parser)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={`flex-1 px-3 py-2 text-xs rounded-xl border font-mono outline-none transition-colors ${
              isDark
                ? 'bg-[#181818] border-[#333333] text-white focus:border-red-500'
                : 'bg-[#fbfbfb] border-[#dcdcdc] text-black focus:border-red-500'
            }`}
          />
          <button
            type="button"
            onClick={handleSaveApiKey}
            className="flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm cursor-pointer"
          >
            {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            <span>{isSaved ? 'Saved' : 'Save Key'}</span>
          </button>
        </div>
        <p className={`text-[11px] m-0 ${isDark ? 'text-[#888888]' : 'text-[#777777]'}`}>
          If set, the desktop app batches video duration queries in up to 50 items per call. When empty, durations are synced automatically over the bridge from connected extensions or retrieved on-demand.
        </p>
      </div>
    </motion.div>
  )
}

