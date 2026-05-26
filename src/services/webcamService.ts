import type { WebcamDevice, WebcamOptions } from '../types/tracking'

export type GetUserMedia = (constraints: MediaStreamConstraints) => Promise<MediaStream>
export type EnumerateDevices = () => Promise<MediaDeviceInfo[]>

export const LOCAL_PRIVACY_POSTURE =
  'Webcam frames are captured and processed in the browser. No backend or cloud transport is used.'

export function buildVideoConstraints(options: WebcamOptions = {}): MediaStreamConstraints {
  const videoConstraints = {
    frameRate: { ideal: 60, max: 60 },
    height: { ideal: 720 },
    width: { ideal: 1280 },
  }

  return {
    audio: false,
    video: options.deviceId
      ? {
          ...videoConstraints,
          deviceId: { exact: options.deviceId },
        }
      : {
          ...videoConstraints,
          facingMode: options.facingMode ?? 'user',
        },
  }
}

export function getBrowserGetUserMedia(): GetUserMedia | null {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return null
  }

  return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
}

export function getBrowserEnumerateDevices(): EnumerateDevices | null {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return null
  }

  return navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices)
}

export async function listVideoInputDevices(enumerateDevices = getBrowserEnumerateDevices()) {
  if (!enumerateDevices) {
    return []
  }

  const devices = await enumerateDevices()
  let unnamedIndex = 0

  return devices.flatMap<WebcamDevice>((device) => {
    if (device.kind !== 'videoinput') {
      return []
    }

    unnamedIndex += 1

    return [
      {
        deviceId: device.deviceId,
        kind: 'videoinput',
        label: device.label || `Camera ${unnamedIndex}`,
      },
    ]
  })
}

export async function requestWebcamStream(
  options: WebcamOptions & { getUserMedia?: GetUserMedia } = {},
) {
  const getUserMedia = options.getUserMedia ?? getBrowserGetUserMedia()

  if (!getUserMedia) {
    throw new DOMException('Camera APIs are not available in this browser.', 'NotSupportedError')
  }

  return getUserMedia(buildVideoConstraints(options))
}

export async function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream) {
  if (video.srcObject !== stream) {
    video.srcObject = stream
  }

  await video.play()
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function describeWebcamError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera permission was denied. Enable webcam access to start local tracking.'
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No webcam was detected on this device.'
    }

    if (error.name === 'NotReadableError') {
      return 'The webcam is already in use by another application.'
    }

    if (error.name === 'NotSupportedError') {
      return 'This browser does not expose the webcam APIs required by HandFlow.'
    }
  }

  return 'Unable to start the local webcam stream.'
}
