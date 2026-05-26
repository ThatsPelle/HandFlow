import { describe, expect, it, vi } from 'vitest'
import { createPointerCommand, HandFlowPointerBridge } from './pointerBridge'
import type { HandTrackingSnapshot } from '../types/tracking'
import { createIdleGestureSnapshot } from './gestureEngine'

function snapshot(
  gesture: HandTrackingSnapshot['gesture']['name'],
  phase: HandTrackingSnapshot['gesture']['phase'],
  x = 0.4,
  y = 0.3,
): HandTrackingSnapshot {
  return {
    confidence: 0.9,
    decayProgress: 0,
    gesture: {
      ...createIdleGestureSnapshot(100),
      confidence: gesture === 'none' ? 0 : 0.92,
      name: gesture,
      phase,
    },
    landmarkCount: 21,
    lastDetectedAt: 100,
    primaryHand: {
      handedness: 'Right',
      landmarks: Array.from({ length: 21 }, (_, index) => ({
        x,
        y,
        z: 0,
        ...(index === 8 ? { x, y } : {}),
      })),
      score: 0.9,
    },
    status: 'detected',
  }
}

describe('pointerBridge', () => {
  it('mirrors index fingertip horizontally into normalized move commands', () => {
    expect(createPointerCommand(snapshot('open-palm', 'active', 0.25, 0.75), false)).toEqual({
      down: false,
      type: 'move',
      x: 0.75,
      y: 0.75,
    })
  })

  it('turns pinch activation into mouse down and pinch exit into mouse up', () => {
    expect(createPointerCommand(snapshot('pinch', 'active'), false)?.type).toBe('down')
    expect(createPointerCommand(snapshot('pinch', 'exiting'), true)?.type).toBe('up')
  })

  it('does not emit commands when bridge disabled', () => {
    const sender = vi.fn()
    const bridge = new HandFlowPointerBridge(sender)

    bridge.update(snapshot('open-palm', 'active'))

    expect(sender).not.toHaveBeenCalled()
  })

  it('sends move and click lifecycle when enabled', () => {
    const sender = vi.fn()
    const bridge = new HandFlowPointerBridge(sender)

    bridge.setEnabled(true)
    bridge.update(snapshot('open-palm', 'active', 0.2, 0.3))
    bridge.update(snapshot('pinch', 'active', 0.2, 0.3))
    bridge.update(snapshot('pinch', 'exiting', 0.2, 0.3))

    expect(sender).toHaveBeenCalledWith(expect.objectContaining({ type: 'move' }))
    expect(sender).toHaveBeenCalledWith(expect.objectContaining({ type: 'down' }))
    expect(sender).toHaveBeenCalledWith(expect.objectContaining({ type: 'up' }))
  })
})
