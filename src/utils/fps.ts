export function sampleFps(deltaMs: number) {
  if (deltaMs <= 0) {
    return 60
  }

  return Math.min(60, Math.round(1000 / deltaMs))
}

export function formatFps(fps: number | null) {
  if (fps === null) {
    return '-- FPS'
  }

  return `${Math.round(fps)} FPS`
}
