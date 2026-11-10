import React from 'react'
import { motion } from 'framer-motion'

interface TopDomainsCardProps {
  topDomains: [string, number][]
  totalTabs: number
  maxDomainCount: number
}

export const TopDomainsCard: React.FC<TopDomainsCardProps> = ({
  topDomains,
  totalTabs,
  maxDomainCount
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="p-5 rounded-xl flex flex-col"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Top Domains
      </h3>
      <div className="flex flex-col gap-3">
        {topDomains.map(([domain, count], i) => {
          const percentage = totalTabs > 0 ? Math.round((count / totalTabs) * 100) : 0
          const barWidth = Math.max((count / maxDomainCount) * 100, 4)

          return (
            <motion.div
              key={domain}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.35 + i * 0.04 }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                    alt=""
                    className="w-4 h-4 rounded"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                  <span
                    className="text-[12px] font-medium truncate max-w-[180px]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {domain}
                  </span>
                </div>
                <span
                  className="text-[11px] font-medium shrink-0"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  {count} ({percentage}%)
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--surface-4)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4 + i * 0.05,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      'linear-gradient(to right, var(--accent-gradient-start), var(--accent-gradient-end))'
                  }}
                />
              </div>
            </motion.div>
          )
        })}
        {topDomains.length === 0 && (
          <span
            className="text-xs py-4 text-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No domain data available
          </span>
        )}
      </div>
    </motion.div>
  )
}
