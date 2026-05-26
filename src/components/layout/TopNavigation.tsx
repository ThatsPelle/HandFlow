import { Cpu, ShieldCheck } from 'lucide-react'
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '../../config/appMeta'
import { HandFlowMark } from './HandFlowMark'

export function TopNavigation() {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <HandFlowMark />
        <div>
          <p className="font-display text-lg font-semibold text-white">{APP_NAME}</p>
          <p className="font-mono text-[11px] uppercase text-cyan-soft/80">{APP_TAGLINE}</p>
        </div>
      </div>

      <nav className="hidden items-center gap-2 font-mono text-[11px] uppercase text-slate-300 md:flex">
        <span className="rounded border border-white/10 bg-white/[0.04] px-3 py-2">v{APP_VERSION}</span>
        <span className="rounded border border-white/10 bg-white/[0.04] px-3 py-2">Vision Core</span>
        <span className="rounded border border-white/10 bg-white/[0.04] px-3 py-2">Gesture Bus</span>
        <span className="rounded border border-white/10 bg-white/[0.04] px-3 py-2">Overlay RAF</span>
      </nav>

      <div className="flex items-center gap-2 rounded border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 font-mono text-[11px] uppercase text-emerald-200">
        <ShieldCheck className="h-4 w-4" />
        <span className="hidden sm:inline">On device</span>
        <Cpu className="h-4 w-4 text-cyan-soft" />
      </div>
    </header>
  )
}
