import { motion } from 'framer-motion'
import { FlipHorizontal2, MousePointer2, Play, Square, Waves } from 'lucide-react'
import type { RefObject } from 'react'
import type { TrackingState, WebcamDevice } from '../../types/tracking'
import { cn } from '../../utils/cn'
import { WebcamDeviceButton } from './WebcamDeviceButton'

interface UtilitiesDockProps {
  cameraButtonRef?: RefObject<HTMLButtonElement | null>
  devices: WebcamDevice[]
  isMirrored: boolean
  nativePointerEnabled: boolean
  onOpenDeviceMenu: () => Promise<void> | void
  onSelectDevice: (deviceId: string) => void
  onStart: () => void
  onStop: () => void
  onToggleNativePointer: () => void
  onToggleMirror: () => void
  pointerButtonRef?: RefObject<HTMLButtonElement | null>
  selectedDeviceId: string | null
  startButtonRef?: RefObject<HTMLButtonElement | null>
  status: TrackingState
}

export function UtilitiesDock({
  cameraButtonRef,
  devices,
  isMirrored,
  nativePointerEnabled,
  onOpenDeviceMenu,
  onSelectDevice,
  onStart,
  onStop,
  onToggleNativePointer,
  onToggleMirror,
  pointerButtonRef,
  selectedDeviceId,
  startButtonRef,
  status,
}: UtilitiesDockProps) {
  const isStreaming = status === 'streaming'
  const isBusy = status === 'requesting-permission'

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.38, ease: 'easeOut', delay: 0.12 }}
    >
      <div className="glass-panel flex items-center justify-between gap-3 rounded-lg p-2">
        <WebcamDeviceButton
          buttonRef={cameraButtonRef}
          devices={devices}
          isBusy={isBusy}
          onOpen={onOpenDeviceMenu}
          onSelect={onSelectDevice}
          selectedDeviceId={selectedDeviceId}
        />
        <button
          ref={startButtonRef}
          className={cn(
            'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded px-4 font-mono text-xs uppercase transition',
            isStreaming
              ? 'bg-white/[0.04] text-slate-400'
              : 'bg-cyan-core text-slate-950 shadow-glow hover:bg-cyan-soft',
          )}
          disabled={isStreaming || isBusy}
          onClick={onStart}
          type="button"
        >
          <Play className="h-4 w-4" />
          Run
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded border border-white/10 bg-white/[0.04] px-4 text-slate-200 transition hover:border-signal-rose/40 hover:text-signal-rose"
          disabled={!isStreaming}
          onClick={onStop}
          title="Stop stream"
          type="button"
        >
          <Square className="h-4 w-4" />
        </button>
        <button
          className={cn(
            'inline-flex min-h-11 items-center justify-center rounded border px-4 transition',
            isMirrored
              ? 'border-violet-core/40 bg-violet-core/15 text-violet-soft'
              : 'border-white/10 bg-white/[0.04] text-slate-200',
          )}
          onClick={onToggleMirror}
          title="Mirror webcam"
          type="button"
        >
          <FlipHorizontal2 className="h-4 w-4" />
        </button>
        <button
          ref={pointerButtonRef}
          className={cn(
            'inline-flex min-h-11 items-center justify-center rounded border px-4 transition',
            nativePointerEnabled
              ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-200'
              : 'border-white/10 bg-white/[0.04] text-slate-200',
          )}
          onClick={onToggleNativePointer}
          title="Native pointer bridge"
          type="button"
        >
          <MousePointer2 className="h-4 w-4" />
        </button>
        <div className="hidden items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-[11px] uppercase text-cyan-soft sm:flex">
          <Waves className="h-4 w-4 animate-pulseGlow" />
          {isStreaming ? 'Signal live' : 'Standby'}
        </div>
      </div>
    </motion.div>
  )
}
