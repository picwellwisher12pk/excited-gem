import { useCallback } from 'react'
import React from 'react'
import TimesIcon from 'react:/src/icons/times.svg'
import VolumeOffIcon from 'react:/src/icons/volume-off.svg'
import VolumeSlashIcon from 'react:/src/icons/volume-slash.svg'
import VolumeIcon from 'react:/src/icons/volume.svg'
import ItemBtn from '../ItemBtn'

export const iconHeight: number = 16

export const grayIconStyle: object = { height: iconHeight, fill: 'gray' }
export const blueIconStyle: object = { height: iconHeight, fill: '#0487cf' }

/**
 * Pure React Substring Highlighter component without HTML parser overhead.
 */
export const HighlightedText: React.FC<{
  text: string
  highlight?: string
  className?: string
}> = ({ text, highlight, className }) => {
  if (!text) return null
  if (!highlight || !highlight.trim()) {
    return <span className={className}>{text}</span>
  }

  try {
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = text.split(regex)

    return (
      <span className={className}>
        {parts.map((part, i) => {
          if (regex.test(part)) {
            return (
              <mark
                key={i}
                className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 font-medium"
              >
                {part}
              </mark>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </span>
    )
  } catch {
    return <span className={className}>{text}</span>
  }
}

export function markSearchedTerm(value: string, searchTerm: string) {
  return value
}

export function renderAudioIcon(audible: boolean, mutedInfo: any) {
  if (mutedInfo?.muted) return <VolumeSlashIcon style={grayIconStyle} />
  if (!audible) return <VolumeOffIcon style={grayIconStyle} />
  if (audible) return <VolumeIcon style={blueIconStyle} />
}

const renderActionButtons = ({
  id,
  url,
  activeTab,
  togglePinTab,
  toggleMuteTab,
  closeTab,
  removeTab,
  iconPinned,
  audible
}: any) => {
  const handlePinTab = useCallback(() => togglePinTab(id), [id, togglePinTab])
  const handleMuteTab = useCallback(
    () => toggleMuteTab(id, audible),
    [id, audible, toggleMuteTab]
  )
  const handleCloseTab = useCallback(() => closeTab(id), [id, closeTab])
  const handleRemove = useCallback(() => removeTab(id), [id, removeTab])

  return activeTab ? (
    <>
      <ItemBtn title="Un/Pin Tab" onClick={handlePinTab}>
        {iconPinned}
      </ItemBtn>
      <ItemBtn title="Un/Mute Tab" onClick={handleMuteTab}>
        {renderAudioIcon(audible, { id, url })}
      </ItemBtn>
      <ItemBtn onClick={handleCloseTab} title="Close Tab">
        <TimesIcon style={{ height: 14, fill: 'red' }} />
      </ItemBtn>
    </>
  ) : (
    <ItemBtn onClick={handleRemove} />
  )
}
export default renderActionButtons
