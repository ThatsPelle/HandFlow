import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  MediaPipeHandTrackingPipeline,
  createEmptyHandTrackingSnapshot,
  describeMediaPipeError,
} from '../services/handTrackingService'
import { OverlayRenderer } from '../services/overlayRenderer'
import { HandFlowPointerBridge, PointerWebSocketTransport } from '../services/pointerBridge'
import type { HandTrackingSnapshot } from '../types/tracking'

const TELEMETRY_INTERVAL_MS = 180

export function useOverlayCanvas(
  videoRef: RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  nativePointerEnabled = false,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [fps, setFps] = useState<number | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<HandTrackingSnapshot>(() => ({
    ...createEmptyHandTrackingSnapshot(),
    status: 'awaiting-stream',
  }))

  useEffect(() => {
    if (!isActive || !canvasRef.current) {
      setFps(null)
      setTrackingError(null)
      setSnapshot({ ...createEmptyHandTrackingSnapshot(), status: 'awaiting-stream' })
      return undefined
    }

    const transport = new PointerWebSocketTransport()
    const pointerBridge = new HandFlowPointerBridge((command) => transport.send(command))
    pointerBridge.setEnabled(nativePointerEnabled)
    const pipeline = new MediaPipeHandTrackingPipeline()
    const renderer = new OverlayRenderer(canvasRef.current, setFps)
    let isDisposed = false
    let lastTelemetryAt = 0
    let hasReportedRuntimeError = false

    setTrackingError(null)
    setSnapshot({ ...createEmptyHandTrackingSnapshot(), status: 'initializing' })

    pipeline
      .initialize()
      .then(() => {
        if (!isDisposed) {
          setSnapshot(pipeline.getSnapshot())
        }
      })
      .catch((error: unknown) => {
        if (!isDisposed) {
          setTrackingError(describeMediaPipeError(error))
          setSnapshot({ ...createEmptyHandTrackingSnapshot(), status: 'error' })
        }
      })

    renderer.start((frame) => {
      try {
        const video = videoRef.current

        if (video) {
          pointerBridge.update(pipeline.processVideoFrame(video, frame.elapsedMs))
        }

        pipeline.renderOverlay(frame)

        if (frame.elapsedMs - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
          lastTelemetryAt = frame.elapsedMs
          setSnapshot(pipeline.getSnapshot())
        }
      } catch (error) {
        if (!hasReportedRuntimeError) {
          hasReportedRuntimeError = true
          setTrackingError(describeMediaPipeError(error))
          setSnapshot({ ...createEmptyHandTrackingSnapshot(), status: 'error' })
        }
      }
    })

    return () => {
      isDisposed = true
      renderer.stop()
      pointerBridge.setEnabled(false)
      transport.close()
      pipeline.dispose()
    }
  }, [isActive, nativePointerEnabled, videoRef])

  return {
    canvasRef,
    fps,
    snapshot,
    trackingError,
  } as const
}
