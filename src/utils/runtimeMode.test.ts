import { describe, expect, it } from 'vitest'

import { shouldEnableNativePointerByDefault } from './runtimeMode'

describe('runtimeMode', () => {
  it('enables native pointer by default inside the desktop shell', () => {
    expect(shouldEnableNativePointerByDefault('?desktop=1')).toBe(true)
  })

  it('keeps native pointer disabled by default in a normal browser', () => {
    expect(shouldEnableNativePointerByDefault('')).toBe(false)
  })
})
