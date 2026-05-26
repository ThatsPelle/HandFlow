import { describe, expect, it, vi } from 'vitest'
import {
  HAND_FINGER_TIP_INDICES,
  createEmptyHandTrackingSnapshot,
  normalizeHandLandmarkerResult,
  renderHandTrackingOverlay,
  shouldProcessVideoFrame,
} from './handTrackingService'
import type { OverlayFrameContext } from '../types/tracking'

function createLandmarks() {
  return Array.from({ length: 21 }, (_, index) => ({
    x: 0.1 + index * 0.01,
    y: 0.2 + index * 0.01,
    z: -0.01 * index,
    visibility: 1,
  }))
}

function createFrameContext(context: CanvasRenderingContext2D): OverlayFrameContext {
  return {
    canvas: document.createElement('canvas'),
    context,
    deltaMs: 16,
    elapsedMs: 120,
    height: 720,
    width: 1280,
  }
}

describe('handTrackingService', () => {
  it('normalizes a single MediaPipe hand result into stable telemetry', () => {
    const snapshot = normalizeHandLandmarkerResult(
      {
        handedness: [[{ categoryName: 'Right', displayName: 'Right', index: 0, score: 0.93 }]],
        handednesses: [],
        landmarks: [createLandmarks()],
        worldLandmarks: [],
      },
      124,
    )

    expect(snapshot.status).toBe('detected')
    expect(snapshot.confidence).toBe(0.93)
    expect(snapshot.landmarkCount).toBe(21)
    expect(snapshot.primaryHand?.handedness).toBe('Right')
    expect(snapshot.lastDetectedAt).toBe(124)
  })

  it('returns an inactive snapshot when MediaPipe reports no hands', () => {
    const snapshot = normalizeHandLandmarkerResult(
      {
        handedness: [],
        handednesses: [],
        landmarks: [],
        worldLandmarks: [],
      },
      500,
    )

    expect(snapshot).toEqual(createEmptyHandTrackingSnapshot())
  })

  it('throttles frame processing by timestamp and video frame identity', () => {
    expect(
      shouldProcessVideoFrame({
        lastProcessedFrameTime: -1,
        lastProcessedTimestamp: 0,
        minFrameIntervalMs: 33,
        timestamp: 32,
        videoCurrentTime: 1,
      }),
    ).toBe(false)

    expect(
      shouldProcessVideoFrame({
        lastProcessedFrameTime: 1,
        lastProcessedTimestamp: 0,
        minFrameIntervalMs: 16,
        timestamp: 40,
        videoCurrentTime: 1,
      }),
    ).toBe(false)

    expect(
      shouldProcessVideoFrame({
        lastProcessedFrameTime: 1,
        lastProcessedTimestamp: 0,
        minFrameIntervalMs: 16,
        timestamp: 40,
        videoCurrentTime: 1.04,
      }),
    ).toBe(true)
  })

  it('draws connections, landmarks, and fingertip highlights for an active hand', () => {
    const context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fill: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    renderHandTrackingOverlay(createFrameContext(context), {
      ...createEmptyHandTrackingSnapshot(),
      confidence: 0.88,
      landmarkCount: 21,
      lastDetectedAt: 120,
      primaryHand: {
        handedness: 'Right',
        landmarks: createLandmarks(),
        score: 0.88,
      },
      status: 'detected',
    })

    expect(context.quadraticCurveTo).toHaveBeenCalled()
    expect(context.arc).toHaveBeenCalledTimes(21 + HAND_FINGER_TIP_INDICES.length + 1)
  })
})
