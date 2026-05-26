import { motion } from 'framer-motion'
import { Activity, Gauge, Hand, Radio, ScanLine, WifiOff } from 'lucide-react'
import type { HudTelemetry } from '../../types/tracking'
import { LOCAL_PRIVACY_POSTURE } from '../../services/webcamService'
import { formatFps } from '../../utils/fps'
import { HudMetric } from '../hud/HudMetric'

interface StatusPanelProps {
  error: string | null
  telemetry: HudTelemetry
}

export function StatusPanel({ error, telemetry }: StatusPanelProps) {
  const streamIsLive = telemetry.trackingState === 'streaming'
  const handIsDetected = telemetry.detectionStatus === 'detected'
  const confidence = telemetry.confidence === null ? '--' : `${Math.round(telemetry.confidence * 100)}%`
  const gestureConfidence =
    telemetry.gestureConfidence === null ? '--' : `${Math.round(telemetry.gestureConfidence * 100)}%`

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel flex min-h-[360px] flex-col rounded-lg p-4 lg:h-[calc(100svh-13rem)] lg:min-h-[420px]"
      initial={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase text-cyan-soft">Realtime Status</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-white">Tracking HUD</h2>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.04] p-2 text-cyan-soft">
          <ScanLine className="h-5 w-5" />
        </span>
      </div>

      <div className="grid gap-3">
        <HudMetric icon={<Activity className="h-4 w-4" />} label="Render loop" value={formatFps(telemetry.fps)} />
        <HudMetric
          icon={<Hand className="h-4 w-4" />}
          label="Hand detection"
          tone={handIsDetected ? 'green' : streamIsLive ? 'cyan' : 'amber'}
          value={telemetry.detectionStatus.replace('-', ' ')}
        />
        <HudMetric
          icon={<Gauge className="h-4 w-4" />}
          label="Confidence"
          tone={handIsDetected ? 'green' : 'amber'}
          value={confidence}
        />
        <HudMetric label="Landmarks" tone="cyan" value={`${telemetry.landmarkCount}/21`} />
        <HudMetric
          icon={<Radio className="h-4 w-4" />}
          label="Tracking state"
          tone={streamIsLive ? 'cyan' : 'violet'}
          value={telemetry.trackingState.replace('-', ' ')}
        />
        <HudMetric
          label="Active hand"
          tone="violet"
          value={telemetry.handedness ?? telemetry.activeGesture.replace('-', ' ')}
        />
        <HudMetric
          label="Gesture"
          tone={telemetry.activeGesture === 'none' ? 'amber' : 'violet'}
          value={telemetry.activeGesture.replace('-', ' ')}
        />
        <HudMetric label="Gesture state" tone="cyan" value={telemetry.gesturePhase} />
        <HudMetric label="Gesture confidence" tone="green" value={gestureConfidence} />
      </div>

      <div className="mt-5 rounded border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase text-emerald-200">
          <WifiOff className="h-4 w-4" />
          Offline posture
        </div>
        <p className="text-sm leading-6 text-slate-300">{LOCAL_PRIVACY_POSTURE}</p>
      </div>

      {error || telemetry.trackingError ? (
        <div className="mt-3 rounded border border-signal-rose/30 bg-signal-rose/10 p-3 text-sm text-rose-100">
          {error ?? telemetry.trackingError}
        </div>
      ) : null}
    </motion.aside>
  )
}
