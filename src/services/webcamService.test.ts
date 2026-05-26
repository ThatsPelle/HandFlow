import { describe, expect, it, vi } from 'vitest'
import {
  ensureVideoDeviceLabels,
  buildVideoConstraints,
  describeWebcamError,
  listVideoInputDevices,
  requestWebcamStream,
  stopMediaStream,
} from './webcamService'

describe('webcamService', () => {
  it('requests only local video with no audio channel', async () => {
    const stream = {} as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(stream)

    const result = await requestWebcamStream({ getUserMedia })

    expect(result).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: 'user',
        frameRate: { ideal: 60, max: 60 },
        height: { ideal: 720 },
        width: { ideal: 1280 },
      },
    })
  })

  it('uses client-side friendly video constraints', () => {
    expect(buildVideoConstraints({ facingMode: 'environment' })).toEqual({
      audio: false,
      video: {
        facingMode: 'environment',
        frameRate: { ideal: 60, max: 60 },
        height: { ideal: 720 },
        width: { ideal: 1280 },
      },
    })
  })

  it('uses selected device id when provided', () => {
    expect(buildVideoConstraints({ deviceId: 'cam-2' })).toMatchObject({
      audio: false,
      video: {
        deviceId: { exact: 'cam-2' },
      },
    })
  })

  it('filters enumerateDevices to video inputs', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([
      { deviceId: 'a', kind: 'audioinput', label: 'Mic' },
      { deviceId: 'b', kind: 'videoinput', label: 'Front Cam' },
      { deviceId: 'c', kind: 'videoinput', label: '' },
    ])

    await expect(listVideoInputDevices(enumerateDevices as never)).resolves.toEqual([
      { deviceId: 'b', kind: 'videoinput', label: 'Front Cam' },
      { deviceId: 'c', kind: 'videoinput', label: 'Camera 2' },
    ])
  })

  it('hydrates real device labels by requesting temporary permission when needed', async () => {
    const stop = vi.fn()
    const tempStream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(tempStream)
    const enumerateDevices = vi
      .fn()
      .mockResolvedValueOnce([
        { deviceId: 'cam-a', kind: 'videoinput', label: '' },
        { deviceId: 'cam-b', kind: 'videoinput', label: '' },
      ])
      .mockResolvedValueOnce([
        { deviceId: 'cam-a', kind: 'videoinput', label: 'Logitech Brio' },
        { deviceId: 'cam-b', kind: 'videoinput', label: 'OBS Virtual Camera' },
      ])

    await expect(ensureVideoDeviceLabels({ enumerateDevices, getUserMedia })).resolves.toEqual([
      { deviceId: 'cam-a', kind: 'videoinput', label: 'Logitech Brio' },
      { deviceId: 'cam-b', kind: 'videoinput', label: 'OBS Virtual Camera' },
    ])

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('does not request a temporary stream when labels are already visible', async () => {
    const getUserMedia = vi.fn()
    const enumerateDevices = vi.fn().mockResolvedValue([
      { deviceId: 'cam-a', kind: 'videoinput', label: 'Sony Alpha' },
    ])

    await expect(ensureVideoDeviceLabels({ enumerateDevices, getUserMedia })).resolves.toEqual([
      { deviceId: 'cam-a', kind: 'videoinput', label: 'Sony Alpha' },
    ])

    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('stops every track when releasing webcam resources', () => {
    const stop = vi.fn()
    const stream = {
      getTracks: () => [{ stop }, { stop }],
    } as unknown as MediaStream

    stopMediaStream(stream)

    expect(stop).toHaveBeenCalledTimes(2)
  })

  it('returns permission-focused copy for denied camera access', () => {
    expect(describeWebcamError(new DOMException('Denied', 'NotAllowedError'))).toContain(
      'Camera permission was denied',
    )
  })
})
