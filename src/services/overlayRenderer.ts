import type { OverlayFrameContext } from '../types/tracking'
import { sampleFps } from '../utils/fps'

export type OverlayDrawCallback = (frame: OverlayFrameContext) => void
export type FpsCallback = (fps: number) => void

export class OverlayRenderer {
  private animationFrame: number | null = null
  private readonly canvas: HTMLCanvasElement
  private drawCallback: OverlayDrawCallback | null = null
  private lastFpsReportTimestamp = 0
  private lastTimestamp: number | null = null
  private readonly fpsReportIntervalMs: number
  private readonly onFps?: FpsCallback
  private readonly context: CanvasRenderingContext2D | null

  constructor(canvas: HTMLCanvasElement, onFps?: FpsCallback, fpsReportIntervalMs = 250) {
    this.canvas = canvas
    this.fpsReportIntervalMs = fpsReportIntervalMs
    this.onFps = onFps
    this.context = canvas.getContext('2d')
  }

  start(draw: OverlayDrawCallback) {
    this.stop()
    this.drawCallback = draw
    this.lastTimestamp = null
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  resizeToDisplaySize(pixelRatio = window.devicePixelRatio || 1) {
    const { clientHeight, clientWidth } = this.canvas
    const width = Math.max(1, Math.floor(clientWidth * pixelRatio))
    const height = Math.max(1, Math.floor(clientHeight * pixelRatio))

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }

    return { height, width }
  }

  private tick = (timestamp: number) => {
    if (!this.context || !this.drawCallback) {
      return
    }

    const deltaMs = this.lastTimestamp === null ? 0 : timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp
    const { height, width } = this.resizeToDisplaySize()

    this.context.clearRect(0, 0, width, height)
    this.drawCallback({
      canvas: this.canvas,
      context: this.context,
      deltaMs,
      elapsedMs: timestamp,
      height,
      width,
    })

    if (deltaMs > 0 && timestamp - this.lastFpsReportTimestamp >= this.fpsReportIntervalMs) {
      this.lastFpsReportTimestamp = timestamp
      this.onFps?.(sampleFps(deltaMs))
    }

    this.animationFrame = requestAnimationFrame(this.tick)
  }
}
