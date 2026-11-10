import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Zap, Volume2, Pin } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'

interface KpiCardsProps {
  totalTabs: number
  totalWindows: number
  sleepingTabs: number
  audibleTabs: number
  pinnedTabs: number
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalTabs,
  totalWindows,
  sleepingTabs,
  audibleTabs,
  pinnedTabs
}) => {
  const cards = [
    {
      label: 'Total Tabs',
      value: totalTabs,
      sub: `across ${totalWindows} windows`,
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #0078d4, #00b4d8)'
    },
    {
      label: 'Sleeping',
      value: sleepingTabs,
      sub: `${totalTabs > 0 ? Math.round((sleepingTabs / totalTabs) * 100) : 0}% suspended`,
      icon: Zap,
      gradient: 'linear-gradient(135deg, #d29922, #f0c000)'
    },
    {
      label: 'Audio Playing',
      value: audibleTabs,
      sub: 'active media',
      icon: Volume2,
      gradient: 'linear-gradient(135deg, #2da44e, #3fb950)'
    },
    {
      label: 'Pinned',
      value: pinnedTabs,
      sub: 'pinned tabs',
      icon: Pin,
      gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            className="p-5 rounded-xl flex flex-col transition-all duration-200"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div
              className="w-8 h-1 rounded-full mb-3"
              style={{ background: card.gradient }}
            />
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--surface-3)' }}
              >
                <Icon size={15} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {card.label}
              </span>
            </div>
            <span
              className="text-3xl font-bold mt-1"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em'
              }}
            >
              <AnimatedNumber value={card.value} />
            </span>
            <span className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {card.sub}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
