import React from 'react'
import { motion } from 'framer-motion'
import { Copy } from 'lucide-react'

interface DuplicateItem {
  url: string
  title: string
  count: number
  browserCount: number
}

interface DuplicatesCardProps {
  duplicates: DuplicateItem[]
}

export const DuplicatesCard: React.FC<DuplicatesCardProps> = ({ duplicates }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35 }}
      className="p-5 rounded-xl flex flex-col"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <h3
        className="text-sm font-semibold mb-4 flex items-center gap-2"
        style={{ color: 'var(--text-primary)' }}
      >
        <Copy size={15} style={{ color: 'var(--accent)' }} />
        Duplicate URLs
      </h3>
      <div className="flex flex-col gap-2.5">
        {duplicates.map((dup, i) => (
          <motion.div
            key={dup.url}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.4 + i * 0.05 }}
            className="p-3 rounded-lg flex items-center justify-between text-xs transition-all duration-150"
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          >
            <div className="min-w-0 flex-1 mr-3">
              <div
                className="font-medium truncate text-[13px]"
                style={{ color: 'var(--text-primary)' }}
              >
                {dup.title}
              </div>
              <div
                className="text-[11px] truncate mt-0.5"
                style={{
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {dup.url}
              </div>
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'rgba(229, 72, 77, 0.1)',
                color: 'var(--text-danger)'
              }}
            >
              {dup.count} open
            </span>
          </motion.div>
        ))}
        {duplicates.length === 0 && (
          <div
            className="text-xs py-8 text-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No duplicate tabs detected across your browsers.
          </div>
        )}
      </div>
    </motion.div>
  )
}
