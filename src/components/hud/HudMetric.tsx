import type { ReactNode } from 'react'

interface HudMetricProps {
  icon?: ReactNode
  label: string
  tone?: 'cyan' | 'green' | 'violet' | 'amber' | 'rose'
  value: string
}

const toneClasses = {
  amber: 'text-signal-amber border-signal-amber/20 bg-signal-amber/10',
  cyan: 'text-cyan-soft border-cyan-core/20 bg-cyan-core/10',
  green: 'text-signal-green border-signal-green/20 bg-signal-green/10',
  rose: 'text-signal-rose border-signal-rose/20 bg-signal-rose/10',
  violet: 'text-violet-soft border-violet-core/20 bg-violet-core/10',
}

export function HudMetric({ icon, label, tone = 'cyan', value }: HudMetricProps) {
  return (
    <div className="hud-line rounded border border-white/10 bg-white/[0.035] px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase text-slate-400">{label}</span>
        {icon ? <span className={toneClasses[tone]}>{icon}</span> : null}
      </div>
      <p className={`inline-flex rounded border px-2 py-1 font-mono text-xs ${toneClasses[tone]}`}>
        {value}
      </p>
    </div>
  )
}
