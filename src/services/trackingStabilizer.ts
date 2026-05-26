import type { HandLandmark, HandTrackingSnapshot, TrackedHand } from '../types/tracking'
import { createIdleGestureSnapshot } from './gestureEngine'

interface TrackingStabilizerOptions {
  activationThreshold?: number
  holdDurationMs?: number
  releaseThreshold?: number
}

const DEFAULT_OPTIONS = {
  activationThreshold: 0.62,
  holdDurationMs: 240,
  releaseThreshold: 0.38,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function distance3d(from: HandLandmark, to: HandLandmark) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z

  return Math.hypot(dx, dy, dz)
}

function lerp(from: number, to: number, alpha: number) {
  return from + (to - from) * alpha
}

export function smoothLandmark(
  previous: HandLandmark,
  next: HandLandmark,
  deltaMs: number,
): HandLandmark {
  const motion = distance3d(previous, next)
  const frameScale = clamp(deltaMs / 16.67, 0.75, 2.25)
  const velocityAlpha = clamp(0.24 + motion * 1.9, 0.26, 0.78)
  const alpha = clamp(velocityAlpha * frameScale, 0.22, 0.86)

  return {
    visibility: next.visibility,
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha),
    z: lerp(previous.z, next.z, alpha),
  }
}

export class TrackingStabilizer {
  private readonly activationThreshold: number
  private readonly holdDurationMs: number
  private isActive = false
  private lastSnapshot: HandTrackingSnapshot | null = null
  private lastTimestamp = 0
  private readonly releaseThreshold: number

  constructor(options: TrackingStabilizerOptions = {}) {
    this.activationThreshold = options.activationThreshold ?? DEFAULT_OPTIONS.activationThreshold
    this.holdDurationMs = options.holdDurationMs ?? DEFAULT_OPTIONS.holdDurationMs
    this.releaseThreshold = options.releaseThreshold ?? DEFAULT_OPTIONS.releaseThreshold
  }

  reset() {
    this.isActive = false
    this.lastSnapshot = null
    this.lastTimestamp = 0
  }

  update(snapshot: HandTrackingSnapshot, timestamp: number): HandTrackingSnapshot {
    const deltaMs = this.lastTimestamp === 0 ? 16 : timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp

    if (snapshot.primaryHand) {
      return this.updateDetectedSnapshot(snapshot, timestamp, deltaMs)
    }

    return this.updateLostSnapshot(timestamp)
  }

  private updateDetectedSnapshot(
    snapshot: HandTrackingSnapshot,
    timestamp: number,
    deltaMs: number,
  ): HandTrackingSnapshot {
    const nextHand = snapshot.primaryHand

    if (!nextHand) {
      return this.updateLostSnapshot(timestamp)
    }

    const rawConfidence = snapshot.confidence ?? nextHand.score
    const previousConfidence = this.lastSnapshot?.confidence ?? rawConfidence
    const smoothedConfidence = lerp(previousConfidence, rawConfidence, 0.28)

    if (!this.isActive && smoothedConfidence >= this.activationThreshold) {
      this.isActive = true
    }

    if (this.isActive && (rawConfidence < this.releaseThreshold || smoothedConfidence < this.releaseThreshold)) {
      this.isActive = false
    }

    const primaryHand = smoothHand(this.lastSnapshot?.primaryHand, nextHand, deltaMs)
    const stabilized: HandTrackingSnapshot = {
      decayProgress: 0,
      confidence: smoothedConfidence,
      gesture: snapshot.gesture,
      landmarkCount: primaryHand.landmarks.length,
      lastDetectedAt: timestamp,
      primaryHand,
      status: this.isActive ? 'detected' : 'lost',
    }

    this.lastSnapshot = stabilized
    return stabilized
  }

  private updateLostSnapshot(timestamp: number): HandTrackingSnapshot {
    if (!this.lastSnapshot?.primaryHand || this.lastSnapshot.lastDetectedAt === null) {
      this.isActive = false
      this.lastSnapshot = null
      return {
        decayProgress: 1,
        confidence: null,
        gesture: createIdleGestureSnapshot(timestamp),
        landmarkCount: 0,
        lastDetectedAt: null,
        primaryHand: null,
        status: 'lost',
      }
    }

    const elapsedSinceDetection = timestamp - this.lastSnapshot.lastDetectedAt
    const decayProgress = clamp(elapsedSinceDetection / this.holdDurationMs, 0, 1)

    if (decayProgress >= 1) {
      this.isActive = false
      this.lastSnapshot = null
      return {
        decayProgress: 1,
        confidence: null,
        gesture: createIdleGestureSnapshot(timestamp),
        landmarkCount: 0,
        lastDetectedAt: null,
        primaryHand: null,
        status: 'lost',
      }
    }

    const decayedConfidence = (this.lastSnapshot.confidence ?? 0) * (1 - decayProgress)

    return {
      ...this.lastSnapshot,
      confidence: decayedConfidence,
      decayProgress,
      status: 'lost',
    }
  }
}

function smoothHand(previous: TrackedHand | null | undefined, next: TrackedHand, deltaMs: number): TrackedHand {
  if (!previous || previous.landmarks.length !== next.landmarks.length) {
    return next
  }

  return {
    ...next,
    landmarks: next.landmarks.map((landmark, index) =>
      smoothLandmark(previous.landmarks[index], landmark, deltaMs),
    ),
  }
}
