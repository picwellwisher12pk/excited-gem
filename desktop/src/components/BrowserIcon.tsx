import React from 'react'
import { Globe } from 'lucide-react'
import edgeIcon from '../assets/browsers/edge.svg'
import chromeIcon from '../assets/browsers/chrome.svg'
import firefoxIcon from '../assets/browsers/firefox.svg'
import braveIcon from '../assets/browsers/brave.svg'
import operaIcon from '../assets/browsers/opera.svg'
import safariIcon from '../assets/browsers/safari.svg'

interface BrowserIconProps {
  browserId: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const BrowserIcon: React.FC<BrowserIconProps> = ({
  browserId,
  size = 18,
  className = '',
  style
}) => {
  const id = (browserId || '').toLowerCase()

  let iconSrc: string | null = null
  let browserLabel = 'Browser'

  if (id.includes('edge')) {
    iconSrc = edgeIcon
    browserLabel = 'Microsoft Edge'
  } else if (id.includes('chrome')) {
    iconSrc = chromeIcon
    browserLabel = 'Google Chrome'
  } else if (id.includes('firefox')) {
    iconSrc = firefoxIcon
    browserLabel = 'Mozilla Firefox'
  } else if (id.includes('brave')) {
    iconSrc = braveIcon
    browserLabel = 'Brave'
  } else if (id.includes('opera')) {
    iconSrc = operaIcon
    browserLabel = 'Opera'
  } else if (id.includes('safari')) {
    iconSrc = safariIcon
    browserLabel = 'Safari'
  }

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={browserLabel}
        width={size}
        height={size}
        className={`inline-block shrink-0 select-none ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          objectFit: 'contain',
          verticalAlign: 'middle',
          flexShrink: 0,
          ...style
        }}
        draggable={false}
      />
    )
  }

  return (
    <Globe
      size={size}
      className={`text-slate-400 shrink-0 ${className}`}
      style={style}
    />
  )
}
