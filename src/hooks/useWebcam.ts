import { useCallback, useEffect, useRef, useState } from 'react'
import type { WebcamState } from '../types/tracking'
import {
  attachStreamToVideo,
  describeWebcamError,
  listVideoInputDevices,
  requestWebcamStream,
  stopMediaStream,
} from '../services/webcamService'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<WebcamState>({
    devices: [],
    error: null,
    isMirrored: true,
    selectedDeviceId: null,
    status: 'idle',
    stream: null,
  })

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await listVideoInputDevices()
      setState((current) => ({
        ...current,
        devices,
        selectedDeviceId:
          current.selectedDeviceId && devices.some((device) => device.deviceId === current.selectedDeviceId)
            ? current.selectedDeviceId
            : devices[0]?.deviceId ?? null,
      }))
    } catch {
      setState((current) => ({ ...current, devices: [], selectedDeviceId: null }))
    }
  }, [])

  const stop = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setState((current) => ({ ...current, status: 'idle', stream: null }))
  }, [])

  const start = useCallback(async () => {
    setState((current) => ({ ...current, error: null, status: 'requesting-permission' }))

    try {
      const stream = await requestWebcamStream({ deviceId: state.selectedDeviceId ?? undefined })
      streamRef.current = stream

      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, stream)
      }

      await refreshDevices()
      setState((current) => ({ ...current, error: null, status: 'streaming', stream }))
    } catch (error) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
      setState((current) => ({
        ...current,
        error: describeWebcamError(error),
        status: 'error',
        stream: null,
      }))
    }
  }, [refreshDevices, state.selectedDeviceId])

  const toggleMirror = useCallback(() => {
    setState((current) => ({ ...current, isMirrored: !current.isMirrored }))
  }, [])

  const selectDevice = useCallback((deviceId: string) => {
    setState((current) => ({ ...current, selectedDeviceId: deviceId }))
  }, [])

  useEffect(() => {
    void refreshDevices()
  }, [refreshDevices])

  useEffect(() => stop, [stop])

  return {
    ...state,
    refreshDevices,
    selectDevice,
    start,
    stop,
    toggleMirror,
    videoRef,
  }
}
