import { describe, expect, it } from 'vitest'
import { formatFps, sampleFps } from './fps'

describe('fps utils', () => {
  it('formats unknown fps as a placeholder', () => {
    expect(formatFps(null)).toBe('-- FPS')
  })

  it('formats measured fps as a whole-number HUD value', () => {
    expect(formatFps(59.6)).toBe('60 FPS')
  })

  it('samples fps from frame delta without exceeding 60fps display target', () => {
    expect(sampleFps(16)).toBe(60)
    expect(sampleFps(33.34)).toBe(30)
  })
})
