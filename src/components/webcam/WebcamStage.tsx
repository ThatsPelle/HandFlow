import { motion } from 'framer-motion'
import { Camera, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { RefObject } from 'react'
import type { TrackingState } from '../../types/tracking'
import { cn } from '../../utils/cn'
import { ScanOverlay } from '../hud/ScanOverlay'

interface WebcamStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  error: string | null
  handDetected: boolean
  isMirrored: boolean
  status: TrackingState
  videoRef: RefObject<HTMLVideoElement | null>
}

export function WebcamStage({
  canvasRef,
  error,
  handDetected,
  isMirrored,
  status,
  videoRef,
}: WebcamStageProps) {
  const isStreaming = status === 'streaming'
  const isLoading = status === 'requesting-permission'

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-panel relative h-full min-h-[58vh] overflow-hidden rounded-lg transition-shadow duration-500',
        handDetected && 'shadow-[0_0_70px_rgba(34,211,238,0.24)]',
      )}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-graphite" />
      <video
        ref={videoRef}
        aria-label="Local webcam stream"
        autoPlay
        className={cn(
          'absolute inset-0 h-full w-full object-cover opacity-95 transition-transform duration-300',
          isMirrored && '-scale-x-100',
          !isStreaming && 'opacity-0',
        )}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn('absolute inset-0 h-full w-full transition-transform duration-300', isMirrored && '-scale-x-100')}
      />
      <ScanOverlay />

      {!isStreaming ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded border border-cyan-core/30 bg-cyan-core/10 shadow-glow">
              {isLoading ? (
                <Loader2 className="h-7 w-7 animate-spin text-cyan-soft" />
              ) : status === 'error' ? (
                <TriangleAlert className="h-7 w-7 text-signal-rose" />
              ) : (
                <Camera className="h-7 w-7 text-cyan-soft" />
              )}
            </div>
            <h1 className="font-display text-3xl font-semibold text-white sm:text-5xl">
              HandFlow
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {error ?? 'Client-side webcam capture ready for realtime hand tracking.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded border border-emerald-300/20 bg-black/35 px-3 py-2 font-mono text-[11px] uppercase text-emerald-200 backdrop-blur">
        <ShieldCheck className="h-4 w-4" />
        {handDetected ? 'Hand lock' : 'Local stream'}
      </div>

      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-3 font-mono text-[10px] uppercase text-slate-300 sm:grid-cols-4">
        {['Palm Mesh', 'Gesture Kernel', 'Depth Mask', 'Particles'].map((item) => (
          <div key={item} className="rounded border border-white/10 bg-black/30 px-3 py-2 backdrop-blur">
            {item}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
