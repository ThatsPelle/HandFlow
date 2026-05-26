import { describe, expect, it } from 'vitest'
import {
  GestureStateMachine,
  extractGestureFeatures,
  recognizeGestureCandidate,
} from './gestureEngine'
import type { HandLandmark, TrackedHand } from '../types/tracking'

function makeLandmarks(overrides: Partial<Record<number, Partial<HandLandmark>>> = {}) {
  const landmarks = Array.from({ length: 21 }, (_, index) => ({
    x: 0.5,
    y: 0.72,
    z: 0,
    ...overrides[index],
  }))

  landmarks[0] = { x: 0.5, y: 0.82, z: 0, ...overrides[0] }

  return landmarks
}

function createHand(landmarks: HandLandmark[]): TrackedHand {
  return {
    handedness: 'Right',
    landmarks,
    score: 0.94,
  }
}

const openPalmHand = createHand(
  makeLandmarks({
    2: { x: 0.42, y: 0.64 },
    3: { x: 0.38, y: 0.52 },
    4: { x: 0.34, y: 0.4 },
    5: { x: 0.46, y: 0.62 },
    6: { x: 0.46, y: 0.5 },
    7: { x: 0.46, y: 0.38 },
    8: { x: 0.46, y: 0.26 },
    9: { x: 0.5, y: 0.62 },
    10: { x: 0.5, y: 0.49 },
    11: { x: 0.5, y: 0.37 },
    12: { x: 0.5, y: 0.25 },
    13: { x: 0.54, y: 0.63 },
    14: { x: 0.54, y: 0.51 },
    15: { x: 0.54, y: 0.39 },
    16: { x: 0.54, y: 0.28 },
    17: { x: 0.58, y: 0.64 },
    18: { x: 0.58, y: 0.52 },
    19: { x: 0.58, y: 0.4 },
    20: { x: 0.58, y: 0.3 },
  }),
)

const pinchHand = createHand(
  makeLandmarks({
    4: { x: 0.48, y: 0.32 },
    8: { x: 0.49, y: 0.33 },
    5: { x: 0.46, y: 0.62 },
    6: { x: 0.46, y: 0.5 },
    7: { x: 0.47, y: 0.42 },
    9: { x: 0.52, y: 0.62 },
    12: { x: 0.52, y: 0.48 },
  }),
)

const peaceHand = createHand(
  makeLandmarks({
    5: { x: 0.46, y: 0.62 },
    6: { x: 0.46, y: 0.5 },
    7: { x: 0.46, y: 0.38 },
    8: { x: 0.45, y: 0.25 },
    9: { x: 0.52, y: 0.62 },
    10: { x: 0.52, y: 0.49 },
    11: { x: 0.52, y: 0.37 },
    12: { x: 0.53, y: 0.24 },
    13: { x: 0.56, y: 0.62 },
    14: { x: 0.56, y: 0.55 },
    15: { x: 0.56, y: 0.59 },
    16: { x: 0.56, y: 0.66 },
    17: { x: 0.6, y: 0.62 },
    18: { x: 0.6, y: 0.56 },
    19: { x: 0.6, y: 0.6 },
    20: { x: 0.6, y: 0.67 },
  }),
)

describe('gestureEngine', () => {
  it('extracts normalized hand features for low-cost recognizers', () => {
    const features = extractGestureFeatures(pinchHand)

    expect(features.pinchDistance).toBeLessThan(0.06)
    expect(features.extended.index).toBe(true)
    expect(features.scale).toBeGreaterThan(0.1)
  })

  it('recognizes pinch, open palm, and peace candidates', () => {
    expect(recognizeGestureCandidate(extractGestureFeatures(pinchHand)).name).toBe('pinch')
    expect(recognizeGestureCandidate(extractGestureFeatures(openPalmHand)).name).toBe('open-palm')
    expect(recognizeGestureCandidate(extractGestureFeatures(peaceHand)).name).toBe('peace')
  })

  it('uses entering, active, exiting, and idle states without flicker', () => {
    const machine = new GestureStateMachine({ activationFrames: 2, releaseFrames: 2 })

    expect(machine.update({ confidence: 0.91, name: 'pinch' }, 100).phase).toBe('entering')
    expect(machine.update({ confidence: 0.92, name: 'pinch' }, 132).phase).toBe('active')
    expect(machine.update({ confidence: 0.2, name: 'none' }, 164).phase).toBe('exiting')
    expect(machine.update({ confidence: 0.2, name: 'none' }, 196).phase).toBe('idle')
  })

  it('does not spam new events while the same gesture remains active', () => {
    const machine = new GestureStateMachine({ activationFrames: 1, releaseFrames: 1 })

    const first = machine.update({ confidence: 0.91, name: 'peace' }, 100)
    const second = machine.update({ confidence: 0.93, name: 'peace' }, 132)

    expect(first.justActivated).toBe(true)
    expect(second.justActivated).toBe(false)
    expect(second.durationMs).toBe(32)
  })

  it('can activate pinch immediately while keeping release debounce', () => {
    const machine = new GestureStateMachine({ activationFrames: 2, immediateGestures: ['pinch'], releaseFrames: 2 })

    expect(machine.update({ confidence: 0.91, name: 'pinch' }, 100).phase).toBe('active')
    expect(machine.update({ confidence: 0.2, name: 'none' }, 132).phase).toBe('exiting')
    expect(machine.update({ confidence: 0.2, name: 'none' }, 164).phase).toBe('idle')
  })
})
