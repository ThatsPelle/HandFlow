export type TrackingState = 'idle' | 'requesting-permission' | 'streaming' | 'error'

export type HandDetectionStatus =
  | 'offline'
  | 'awaiting-stream'
  | 'initializing'
  | 'ready'
  | 'detected'
  | 'lost'
  | 'error'

export type GestureName = 'none' | 'pinch' | 'open-palm' | 'peace'

export type GesturePhase = 'idle' | 'entering' | 'active' | 'exiting'

export type ActiveGesture = GestureName

export interface WebcamOptions {
  deviceId?: string
  facingMode?: VideoFacingModeEnum
}

export interface WebcamDevice {
  deviceId: string
  kind: 'videoinput'
  label: string
}

export interface WebcamState {
  devices: WebcamDevice[]
  error: string | null
  isMirrored: boolean
  selectedDeviceId: string | null
  status: TrackingState
  stream: MediaStream | null
}

export interface HudTelemetry {
  activeGesture: ActiveGesture
  confidence: number | null
  detectionStatus: HandDetectionStatus
  fps: number | null
  gestureConfidence: number | null
  gesturePhase: GesturePhase
  handedness: string | null
  landmarkCount: number
  trackingError: string | null
  trackingState: TrackingState
}

export interface OverlayFrameContext {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  deltaMs: number
  elapsedMs: number
  height: number
  width: number
}

export interface HandLandmark {
  visibility?: number
  x: number
  y: number
  z: number
}

export interface TrackedHand {
  handedness: string
  landmarks: HandLandmark[]
  score: number
}

export interface HandTrackingSnapshot {
  decayProgress: number
  confidence: number | null
  gesture: GestureSnapshot
  landmarkCount: number
  lastDetectedAt: number | null
  primaryHand: TrackedHand | null
  status: HandDetectionStatus
}

export interface GestureSnapshot {
  confidence: number
  durationMs: number
  justActivated: boolean
  name: GestureName
  phase: GesturePhase
  timestamp: number
}
