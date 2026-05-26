import { describe, expect, it } from 'vitest'
import { TrackingStabilizer, smoothLandmark } from './trackingStabilizer'
import { createIdleGestureSnapshot } from './gestureEngine'
import type { HandTrackingSnapshot, TrackedHand } from '../types/tracking'

function createHand(x: number, score = 0.9): TrackedHand {
  return {
    handedness: 'Right',
    landmarks: Array.from({ length: 21 }, (_, index) => ({
      x: x + index * 0.001,
      y: 0.4,
      z: -0.01,
    })),
    score,
  }
}

function createDetectedSnapshot(x: number, score = 0.9, timestamp = 100): HandTrackingSnapshot {
  const primaryHand = createHand(x, score)

  return {
    decayProgress: 0,
    confidence: score,
    gesture: createIdleGestureSnapshot(timestamp),
    landmarkCount: primaryHand.landmarks.length,
    lastDetectedAt: timestamp,
    primaryHand,
    status: 'detected',
  }
}

function createLostSnapshot(): HandTrackingSnapshot {
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

describe('TrackingStabilizer', () => {
  it('smooths small landmark jitter without freezing responsive movement', () => {
    const previous = { x: 0.5, y: 0.5, z: 0 }
    const jitter = smoothLandmark(previous, { x: 0.51, y: 0.5, z: 0 }, 16)
    const fastMove = smoothLandmark(previous, { x: 0.82, y: 0.5, z: 0 }, 16)

    expect(jitter.x).toBeGreaterThan(0.5)
    expect(jitter.x).toBeLessThan(0.51)
    expect(fastMove.x).toBeGreaterThan(0.68)
    expect(fastMove.x).toBeLessThan(0.82)
  })

  it('uses confidence hysteresis to avoid active-state flicker', () => {
    const stabilizer = new TrackingStabilizer()

    expect(stabilizer.update(createDetectedSnapshot(0.4, 0.78, 100), 100).status).toBe('detected')
    expect(stabilizer.update(createDetectedSnapshot(0.405, 0.5, 132), 132).status).toBe('detected')
    expect(stabilizer.update(createDetectedSnapshot(0.41, 0.32, 164), 164).status).toBe('lost')
  })

  it('preserves the last hand briefly with a decaying confidence when detection drops', () => {
    const stabilizer = new TrackingStabilizer({ holdDurationMs: 220 })

    stabilizer.update(createDetectedSnapshot(0.4, 0.9, 100), 100)
    const decaying = stabilizer.update(createLostSnapshot(), 190)
    const expired = stabilizer.update(createLostSnapshot(), 360)

    expect(decaying.status).toBe('lost')
    expect(decaying.primaryHand).not.toBeNull()
    expect(decaying.confidence).toBeGreaterThan(0)
    expect(decaying.confidence).toBeLessThan(0.9)
    expect(expired.primaryHand).toBeNull()
    expect(expired.confidence).toBeNull()
  })
})
