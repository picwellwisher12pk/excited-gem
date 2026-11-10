import React from 'react'
import { motion } from 'framer-motion'
import { Play, Loader2, CheckCircle, Trash2 } from 'lucide-react'
import type { RoutineStatus } from './types'

interface RoutineCardProps {
  id: string
  title: string
  desc: string
  tag: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  status: RoutineStatus
  isDark: boolean
  isCustom?: boolean
  onRun: () => void
  onDelete?: () => void
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  title,
  desc,
  tag,
  icon: Icon,
  gradient,
  status,
  isDark,
  isCustom,
  onRun,
  onDelete
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 flex flex-col justify-between transition-all backdrop-blur-md shadow-sm hover:shadow-md ${
        isDark
          ? 'bg-[#222222]/80 border-[#333333] hover:border-[#444444]'
          : 'bg-white/90 border-[#e5e5e5] hover:border-[#d0d0d0]'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
            style={{ background: gradient }}
          >
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                isDark
                  ? 'bg-[#2e2e2e] text-[#aaaaaa] border-[#383838]'
                  : 'bg-[#f0f0f0] text-[#666666] border-[#e0e0e0]'
              }`}
            >
              {tag}
            </span>
            {isCustom && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded-lg text-[#ff4d4f] hover:bg-[#ff4d4f]/10 transition-colors"
                title="Delete custom routine"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-sm font-bold tracking-tight m-0">{title}</h3>
        <p
          className={`text-xs mt-1.5 mb-4 leading-relaxed line-clamp-3 ${
            isDark ? 'text-[#888888]' : 'text-[#666666]'
          }`}
        >
          {desc}
        </p>
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={status !== 'idle'}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
          status === 'done'
            ? 'bg-[#107c41] text-white shadow-sm shadow-[#107c41]/30'
            : status === 'running'
            ? 'bg-[#333333] text-[#aaa] cursor-wait'
            : 'bg-gradient-to-r from-[#0078d4] to-[#106ebe] text-white hover:brightness-110 active:scale-98 shadow-sm shadow-[#0078d4]/30'
        }`}
      >
        {status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === 'done' && <CheckCircle className="w-4 h-4" />}
        {status === 'idle' && <Play className="w-3.5 h-3.5 fill-current" />}
        <span>
          {status === 'running' ? 'Executing...' : status === 'done' ? 'Completed!' : 'Run Routine'}
        </span>
      </button>
    </motion.div>
  )
}
