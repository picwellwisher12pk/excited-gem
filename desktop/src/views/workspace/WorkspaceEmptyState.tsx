import React from 'react'
import { LayoutGrid } from 'lucide-react'
import { motion } from 'framer-motion'

interface WorkspaceEmptyStateProps {
  onResetFilters: () => void
}

export const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({
  onResetFilters
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[360px]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md p-8 rounded-2xl flex flex-col items-center"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-5"
          style={{
            background: 'var(--accent-subtle)',
            color: 'var(--accent)',
            border: '1px solid var(--border-accent)'
          }}
        >
          <LayoutGrid size={28} />
        </div>
        <h3
          className="text-base font-semibold mb-1.5"
          style={{ color: 'var(--text-primary)' }}
        >
          No Matching Windows
        </h3>
        <p
          className="text-sm mb-4 leading-relaxed max-w-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          No tabs match the current search filters or browser selection.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all shadow-sm"
        >
          Reset Filters
        </button>
      </motion.div>
    </div>
  )
}
