import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type {
  HandTrackingSnapshot,
  OverlayFrameContext,
  TrackedHand,
} from '../types/tracking'
import {
  GestureStateMachine,
  createIdleGestureSnapshot,
  extractGestureFeatures,
  recognizeGestureCandidate,
} from './gestureEngine'
import { TrackingStabilizer } from './trackingStabilizer'

const MEDIAPIPE_WASM_ROOT = '/mediapipe/wasm'
const HAND_LANDMARKER_MODEL = '/mediapipe/models/hand_landmarker.task'
const DEFAULT_MIN_FRAME_INTERVAL_MS = 33

export const HAND_FINGER_TIP_INDICES = [4, 8, 12, 16, 20]

const FALLBACK_HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const

interface FrameGateInput {
  lastProcessedFrameTime: number
  lastProcessedTimestamp: number
  minFrameIntervalMs: number
  timestamp: number
  videoCurrentTime: number
}

export function createEmptyHandTrackingSnapshot(): HandTrackingSnapshot {
  return {
    decayProgress: 1,
    confidence: null,
    gesture: createIdleGestureSnapshot(),
    landmarkCount: 0,
    lastDetectedAt: null,
    primaryHand: null,
    status: 'lost',
  }
}

export function shouldProcessVideoFrame({
  lastProcessedFrameTime,
  lastProcessedTimestamp,
  minFrameIntervalMs,
  timestamp,
  videoCurrentTime,
}: FrameGateInput) {
  if (timestamp - lastProcessedTimestamp < minFrameIntervalMs) {
    return false
  }

  return videoCurrentTime !== lastProcessedFrameTime
}

export function normalizeHandLandmarkerResult(
  result: HandLandmarkerResult,
  timestamp: number,
): HandTrackingSnapshot {
  const landmarks = result.landmarks[0]

  if (!landmarks?.length) {
    return createEmptyHandTrackingSnapshot()
  }

  const handedness = result.handedness[0]?.[0] ?? result.handednesses[0]?.[0]
  const trackedHand: TrackedHand = {
    handedness: handedness?.categoryName || handedness?.displayName || 'Unknown',
    landmarks: landmarks.map(({ visibility, x, y, z }) => ({ visibility, x, y, z })),
    score: handedness?.score ?? 1,
  }

  return {
    decayProgress: 0,
    confidence: trackedHand.score,
    gesture: createIdleGestureSnapshot(timestamp),
    landmarkCount: trackedHand.landmarks.length,
    lastDetectedAt: timestamp,
    primaryHand: trackedHand,
    status: 'detected',
  }
}

export function describeMediaPipeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return `MediaPipe hand tracking failed to initialize: ${error.message}`
  }

  return 'MediaPipe hand tracking failed to initialize.'
}

export function renderHandTrackingOverlay(
  frame: OverlayFrameContext,
  snapshot: HandTrackingSnapshot,
) {
  const { context, elapsedMs, height, width } = frame
  const hand = snapshot.primaryHand

  if (!hand) {
    renderSearchReticle(frame)
    return
  }

  const pulse = 0.5 + Math.sin(elapsedMs / 180) * 0.5
  const confidenceAlpha = Math.max(0.22, snapshot.confidence ?? hand.score)
  const decayAlpha = 1 - snapshot.decayProgress
  const alpha = Math.max(0.08, Math.min(1, confidenceAlpha * decayAlpha))
  const gesturePulse =
    snapshot.gesture.phase === 'active' || snapshot.gesture.phase === 'entering'
      ? 0.18 + snapshot.gesture.confidence * 0.28
      : 0
  const points = hand.landmarks.map((landmark) => ({
    ...landmark,
    px: landmark.x * width,
    py: landmark.y * height,
  }))

  context.save()
  context.globalAlpha = alpha
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.shadowBlur = 12 + pulse * 12 + gesturePulse * 18
  context.shadowColor = `rgba(34, 211, 238, ${0.34 + alpha * 0.34 + gesturePulse})`
  context.strokeStyle = `rgba(34, 211, 238, ${0.42 + alpha * 0.44 + gesturePulse * 0.35})`
  context.lineWidth = Math.max(2, width * 0.0022)

  for (const [from, to] of FALLBACK_HAND_CONNECTIONS) {
    const start = points[from]
    const end = points[to]

    if (!start || !end) {
      continue
    }

    context.beginPath()
    context.moveTo(start.px, start.py)
    context.quadraticCurveTo((start.px + end.px) / 2, (start.py + end.py) / 2, end.px, end.py)
    context.stroke()
  }

  context.shadowBlur = 8 + pulse * 6
  for (const point of points) {
    const depthScale = Math.max(0.65, 1 - Math.abs(point.z) * 1.5)
    context.fillStyle = `rgba(103, 232, 249, ${0.48 + alpha * 0.44})`
    context.beginPath()
    context.arc(point.px, point.py, Math.max(3.2, width * 0.0032) * depthScale, 0, Math.PI * 2)
    context.fill()
  }

  context.shadowColor = `rgba(192, 132, 252, ${0.3 + alpha * 0.6 + gesturePulse})`
  context.fillStyle = `rgba(192, 132, 252, ${0.55 + alpha * 0.4})`
  for (const index of getGestureHighlightIndices(snapshot.gesture.name)) {
    const point = points[index]

    if (!point) {
      continue
    }

    context.beginPath()
    context.arc(
      point.px,
      point.py,
      Math.max(6, width * 0.005) + pulse * 2.5 + gesturePulse * 8,
      0,
      Math.PI * 2,
    )
    context.fill()
  }

  const wrist = points[0]
  if (wrist) {
    const glow = context.createRadialGradient(wrist.px, wrist.py, 0, wrist.px, wrist.py, width * 0.18)
    glow.addColorStop(0, `rgba(34, 211, 238, ${0.08 + alpha * 0.1 + gesturePulse * 0.18})`)
    glow.addColorStop(0.45, `rgba(168, 85, 247, ${0.04 + alpha * 0.06 + gesturePulse * 0.12})`)
    glow.addColorStop(1, 'rgba(168, 85, 247, 0)')
    context.fillStyle = glow
    context.beginPath()
    context.arc(wrist.px, wrist.py, width * 0.18, 0, Math.PI * 2)
    context.fill()
  }

  context.restore()
}

function getGestureHighlightIndices(gestureName: HandTrackingSnapshot['gesture']['name']) {
  if (gestureName === 'pinch') {
    return [4, 8]
  }

  if (gestureName === 'peace') {
    return [8, 12]
  }

  return HAND_FINGER_TIP_INDICES
}

function renderSearchReticle({ context, elapsedMs, height, width }: OverlayFrameContext) {
  const centerX = width / 2
  const centerY = height / 2
  const pulse = 0.5 + Math.sin(elapsedMs / 260) * 0.5

  context.save()
  context.strokeStyle = `rgba(34, 211, 238, ${0.2 + pulse * 0.2})`
  context.lineWidth = Math.max(1, width * 0.0012)
  context.setLineDash([8, 16])
  context.beginPath()
  context.arc(centerX, centerY, Math.min(width, height) * (0.16 + pulse * 0.015), 0, Math.PI * 2)
  context.stroke()
  context.setLineDash([])
  context.restore()
}

export class MediaPipeHandTrackingPipeline {
  private handLandmarker: HandLandmarker | null = null
  private initPromise: Promise<void> | null = null
  private lastProcessedFrameTime = -1
  private lastProcessedTimestamp = 0
  private readonly minFrameIntervalMs: number
  private readonly gestureMachine = new GestureStateMachine({
    immediateGestures: ['pinch'],
    releaseFrames: 2,
  })
  private snapshot: HandTrackingSnapshot = createEmptyHandTrackingSnapshot()
  private readonly stabilizer = new TrackingStabilizer()
  private status: HandTrackingSnapshot['status'] = 'initializing'

  constructor(minFrameIntervalMs = DEFAULT_MIN_FRAME_INTERVAL_MS) {
    this.minFrameIntervalMs = minFrameIntervalMs
  }

  async initialize() {
    if (this.handLandmarker) {
      return
    }

    this.initPromise ??= this.createLandmarker()
    await this.initPromise
  }

  getSnapshot(): HandTrackingSnapshot {
    return this.snapshot.primaryHand ? this.snapshot : { ...this.snapshot, status: this.status }
  }

  processVideoFrame(video: HTMLVideoElement, timestamp: number) {
    if (!this.handLandmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return this.getSnapshot()
    }

    if (
      !shouldProcessVideoFrame({
        lastProcessedFrameTime: this.lastProcessedFrameTime,
        lastProcessedTimestamp: this.lastProcessedTimestamp,
        minFrameIntervalMs: this.minFrameIntervalMs,
        timestamp,
        videoCurrentTime: video.currentTime,
      })
    ) {
      return this.getSnapshot()
    }

    this.lastProcessedFrameTime = video.currentTime
    this.lastProcessedTimestamp = timestamp
    this.snapshot = this.withGesture(
      this.stabilizer.update(
      normalizeHandLandmarkerResult(this.handLandmarker.detectForVideo(video, timestamp), timestamp),
      timestamp,
      ),
      timestamp,
    )
    this.status = this.snapshot.status === 'detected' ? 'detected' : 'ready'

    return this.getSnapshot()
  }

  renderOverlay(frame: OverlayFrameContext) {
    renderHandTrackingOverlay(frame, this.getSnapshot())
  }

  dispose() {
    this.handLandmarker?.close()
    this.handLandmarker = null
    this.initPromise = null
    this.snapshot = createEmptyHandTrackingSnapshot()
    this.gestureMachine.reset()
    this.stabilizer.reset()
    this.status = 'lost'
  }

  private withGesture(snapshot: HandTrackingSnapshot, timestamp: number): HandTrackingSnapshot {
    if (snapshot.status !== 'detected' || !snapshot.primaryHand) {
      return {
        ...snapshot,
        gesture: this.gestureMachine.update({ confidence: 0, name: 'none' }, timestamp),
      }
    }

    return {
      ...snapshot,
      gesture: this.gestureMachine.update(
        recognizeGestureCandidate(extractGestureFeatures(snapshot.primaryHand)),
        timestamp,
      ),
    }
  }

  private async createLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT)

    try {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          delegate: 'GPU',
          modelAssetPath: HAND_LANDMARKER_MODEL,
        },
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        numHands: 1,
        runningMode: 'VIDEO',
      })
    } catch {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          delegate: 'CPU',
          modelAssetPath: HAND_LANDMARKER_MODEL,
        },
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        numHands: 1,
        runningMode: 'VIDEO',
      })
    }

    this.status = 'ready'
    this.snapshot = { ...createEmptyHandTrackingSnapshot(), status: 'ready' }
  }
}
