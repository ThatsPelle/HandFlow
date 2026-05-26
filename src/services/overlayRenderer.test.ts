import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OverlayRenderer } from './overlayRenderer'

describe('OverlayRenderer', () => {
  beforeEach(() => {
    let frameCalls = 0
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCalls += 1
        if (frameCalls === 1) {
          callback(16)
        }
        return 1
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('drives rendering through requestAnimationFrame without React state', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    const renderer = new OverlayRenderer(canvas)
    const draw = vi.fn()

    renderer.start(draw)

    expect(draw).toHaveBeenCalledWith(expect.objectContaining({ canvas, deltaMs: 0, elapsedMs: 16 }))
    expect(requestAnimationFrame).toHaveBeenCalled()
  })

  it('cancels its animation frame when stopped', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    const renderer = new OverlayRenderer(canvas)

    renderer.start(vi.fn())
    renderer.stop()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})
