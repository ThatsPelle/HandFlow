import type {
  GestureName,
  GesturePhase,
  GestureSnapshot,
  HandLandmark,
  TrackedHand,
} from '../types/tracking'

type FingerName = 'index' | 'middle' | 'ring' | 'pinky' | 'thumb'

export interface GestureCandidate {
  confidence: number
  name: GestureName
}

export interface GestureFeatures {
  extended: Record<FingerName, boolean>
  fingerSpread: number
  palmCenter: HandLandmark
  pinchDistance: number
  scale: number
}

interface GestureStateMachineOptions {
  activationFrames?: number
  immediateGestures?: GestureName[]
  releaseFrames?: number
}

const FINGER_JOINTS = {
  index: { base: 5, pip: 6, tip: 8 },
  middle: { base: 9, pip: 10, tip: 12 },
  ring: { base: 13, pip: 14, tip: 16 },
  pinky: { base: 17, pip: 18, tip: 20 },
  thumb: { base: 1, pip: 3, tip: 4 },
} as const

const IDLE_GESTURE: GestureSnapshot = {
  confidence: 0,
  durationMs: 0,
  justActivated: false,
  name: 'none',
  phase: 'idle',
  timestamp: 0,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function distance(a: HandLandmark, b: HandLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

function midpoint(...points: HandLandmark[]): HandLandmark {
  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
      z: acc.z + point.z,
    }),
    { x: 0, y: 0, z: 0 },
  )

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  }
}

export function createIdleGestureSnapshot(timestamp = 0): GestureSnapshot {
  return { ...IDLE_GESTURE, timestamp }
}

export function extractGestureFeatures(hand: TrackedHand): GestureFeatures {
  const landmarks = hand.landmarks
  const wrist = landmarks[0]
  const indexBase = landmarks[5]
  const pinkyBase = landmarks[17]
  const middleBase = landmarks[9]
  const scale = Math.max(0.001, distance(wrist, middleBase) + distance(indexBase, pinkyBase) * 0.5)
  const normalizedDistance = (from: number, to: number) => distance(landmarks[from], landmarks[to]) / scale
  const isExtended = (finger: Exclude<FingerName, 'thumb'>) => {
    const joints = FINGER_JOINTS[finger]
    const tipFromWrist = normalizedDistance(0, joints.tip)
    const pipFromWrist = normalizedDistance(0, joints.pip)

    return tipFromWrist > pipFromWrist + 0.16 && landmarks[joints.tip].y < landmarks[joints.pip].y
  }

  return {
    extended: {
      index: isExtended('index'),
      middle: isExtended('middle'),
      pinky: isExtended('pinky'),
      ring: isExtended('ring'),
      thumb: normalizedDistance(FINGER_JOINTS.thumb.base, FINGER_JOINTS.thumb.tip) > 0.42,
    },
    fingerSpread: Math.abs(landmarks[8].x - landmarks[20].x) / scale,
    palmCenter: midpoint(landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]),
    pinchDistance: distance(landmarks[4], landmarks[8]) / scale,
    scale,
  }
}

export function recognizeGestureCandidate(features: GestureFeatures): GestureCandidate {
  const pinch = scorePinch(features)
  const peace = scorePeace(features)
  const openPalm = scoreOpenPalm(features)
  const best = [pinch, peace, openPalm].sort((a, b) => b.confidence - a.confidence)[0]

  if (best.confidence < 0.58) {
    return { confidence: 0, name: 'none' }
  }

  return best
}

function scorePinch(features: GestureFeatures): GestureCandidate {
  const confidence = clamp((0.28 - features.pinchDistance) / 0.18, 0, 1)

  return {
    confidence,
    name: 'pinch',
  }
}

function scoreOpenPalm(features: GestureFeatures): GestureCandidate {
  const extended = features.extended
  const extendedCount = Number(extended.index) + Number(extended.middle) + Number(extended.ring) + Number(extended.pinky)
  const spreadBonus = clamp(features.fingerSpread / 1.25, 0, 1) * 0.18
  const confidence = clamp(extendedCount / 4 + spreadBonus, 0, 1)

  return {
    confidence,
    name: 'open-palm',
  }
}

function scorePeace(features: GestureFeatures): GestureCandidate {
  const extended = features.extended
  const matches =
    Number(extended.index) +
    Number(extended.middle) +
    Number(!extended.ring) +
    Number(!extended.pinky)
  const confidence = clamp(matches / 4, 0, 1)

  return {
    confidence,
    name: 'peace',
  }
}

export class GestureStateMachine {
  private activeGesture: GestureName = 'none'
  private activationFrames = 2
  private candidateFrames = 0
  private candidateGesture: GestureName = 'none'
  private gestureStartedAt = 0
  private readonly immediateGestures: Set<GestureName>
  private lastConfidence = 0
  private phase: GesturePhase = 'idle'
  private releaseFrames = 2
  private releaseFrameCount = 0

  constructor(options: GestureStateMachineOptions = {}) {
    this.activationFrames = options.activationFrames ?? this.activationFrames
    this.immediateGestures = new Set(options.immediateGestures ?? [])
    this.releaseFrames = options.releaseFrames ?? this.releaseFrames
  }

  reset(timestamp = 0): GestureSnapshot {
    this.activeGesture = 'none'
    this.candidateFrames = 0
    this.candidateGesture = 'none'
    this.gestureStartedAt = timestamp
    this.lastConfidence = 0
    this.phase = 'idle'
    this.releaseFrameCount = 0

    return createIdleGestureSnapshot(timestamp)
  }

  update(candidate: GestureCandidate, timestamp: number): GestureSnapshot {
    if (candidate.name === 'none') {
      return this.updateNoCandidate(timestamp)
    }

    if (this.activeGesture === candidate.name && (this.phase === 'active' || this.phase === 'entering')) {
      this.phase = 'active'
      this.releaseFrameCount = 0
      this.lastConfidence = smoothConfidence(this.lastConfidence, candidate.confidence)
      return this.snapshot(timestamp, false)
    }

    if (this.candidateGesture !== candidate.name) {
      this.candidateGesture = candidate.name
      this.candidateFrames = 0
    }

    this.candidateFrames += 1
    this.lastConfidence = candidate.confidence

    if (this.immediateGestures.has(candidate.name) || this.candidateFrames >= this.activationFrames) {
      const isNewGesture = this.activeGesture !== candidate.name
      this.activeGesture = candidate.name
      this.phase = 'active'
      this.gestureStartedAt = timestamp
      this.releaseFrameCount = 0
      return this.snapshot(timestamp, isNewGesture)
    }

    this.phase = 'entering'
    return {
      confidence: candidate.confidence,
      durationMs: 0,
      justActivated: false,
      name: candidate.name,
      phase: 'entering',
      timestamp,
    }
  }

  private updateNoCandidate(timestamp: number): GestureSnapshot {
    this.candidateFrames = 0
    this.candidateGesture = 'none'

    if (this.activeGesture === 'none') {
      return this.reset(timestamp)
    }

    this.releaseFrameCount += 1

    if (this.releaseFrameCount >= this.releaseFrames) {
      return this.reset(timestamp)
    }

    this.phase = 'exiting'
    this.lastConfidence = smoothConfidence(this.lastConfidence, 0)
    return this.snapshot(timestamp, false)
  }

  private snapshot(timestamp: number, justActivated: boolean): GestureSnapshot {
    return {
      confidence: this.lastConfidence,
      durationMs: this.gestureStartedAt > 0 ? timestamp - this.gestureStartedAt : 0,
      justActivated,
      name: this.activeGesture,
      phase: this.phase,
      timestamp,
    }
  }
}

function smoothConfidence(previous: number, next: number) {
  return previous + (next - previous) * 0.35
}
