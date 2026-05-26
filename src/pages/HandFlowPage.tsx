import { useEffect, useState, useRef } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { UtilitiesDock } from '../components/layout/UtilitiesDock'
import { OnboardingTour } from '../components/onboarding/OnboardingTour'
import { StatusPanel } from '../components/panels/StatusPanel'
import { WebcamStage } from '../components/webcam/WebcamStage'
import { APP_NAME } from '../config/appMeta'
import { useOverlayCanvas } from '../hooks/useOverlayCanvas'
import { useWebcam } from '../hooks/useWebcam'
import type { HudTelemetry } from '../types/tracking'
import type { OnboardingStepId } from '../utils/onboarding'
import { readOnboardingFlag, shouldShowOnboarding, writeOnboardingFlag } from '../utils/onboarding'
import { shouldEnableNativePointerByDefault } from '../utils/runtimeMode'

export function HandFlowPage() {
  const [nativePointerEnabled, setNativePointerEnabled] = useState(shouldEnableNativePointerByDefault)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() =>
    shouldShowOnboarding(readOnboardingFlag(typeof window === 'undefined' ? null : window.localStorage)),
  )
  const [onboardingRects, setOnboardingRects] = useState<Partial<Record<OnboardingStepId, DOMRect>>>({})
  const cameraButtonRef = useRef<HTMLButtonElement | null>(null)
  const pointerButtonRef = useRef<HTMLButtonElement | null>(null)
  const startButtonRef = useRef<HTMLButtonElement | null>(null)
  const webcam = useWebcam()
  const overlay = useOverlayCanvas(webcam.videoRef, webcam.status === 'streaming', nativePointerEnabled)
  const handDetected = overlay.snapshot.status === 'detected'
  const onboardingSteps = [
    {
      body: 'Pick webcam you want HandFlow to use before starting local tracking.',
      id: 'camera',
      title: 'Choose camera',
    },
    {
      body: `Press Run to open local webcam stream and start ${APP_NAME} hand tracking.`,
      id: 'run',
      title: 'Start tracking',
    },
    {
      body: 'Enable pointer control when you want open palm movement and pinch click or drag on desktop.',
      id: 'pointer',
      title: 'Control cursor',
    },
  ] as const

  const telemetry: HudTelemetry = {
    activeGesture: overlay.snapshot.gesture.name,
    confidence: overlay.snapshot.confidence,
    detectionStatus: webcam.status === 'streaming' ? overlay.snapshot.status : 'awaiting-stream',
    fps: overlay.fps,
    gestureConfidence: overlay.snapshot.gesture.name === 'none' ? null : overlay.snapshot.gesture.confidence,
    gesturePhase: overlay.snapshot.gesture.phase,
    handedness: overlay.snapshot.primaryHand?.handedness ?? null,
    landmarkCount: overlay.snapshot.landmarkCount,
    trackingError: overlay.trackingError,
    trackingState: webcam.status,
  }

  useEffect(() => {
    if (!isOnboardingOpen) {
      return
    }

    let frame = 0
    let disposed = false

    function updateRects() {
      const nextRects = {
        camera: cameraButtonRef.current?.getBoundingClientRect(),
        pointer: pointerButtonRef.current?.getBoundingClientRect(),
        run: startButtonRef.current?.getBoundingClientRect(),
      }

      if (!disposed) {
        setOnboardingRects((current) => {
          const currentCamera = current.camera
          const nextCamera = nextRects.camera
          const currentPointer = current.pointer
          const nextPointer = nextRects.pointer
          const currentRun = current.run
          const nextRun = nextRects.run

          const unchanged =
            currentCamera?.x === nextCamera?.x &&
            currentCamera?.y === nextCamera?.y &&
            currentCamera?.width === nextCamera?.width &&
            currentCamera?.height === nextCamera?.height &&
            currentPointer?.x === nextPointer?.x &&
            currentPointer?.y === nextPointer?.y &&
            currentPointer?.width === nextPointer?.width &&
            currentPointer?.height === nextPointer?.height &&
            currentRun?.x === nextRun?.x &&
            currentRun?.y === nextRun?.y &&
            currentRun?.width === nextRun?.width &&
            currentRun?.height === nextRun?.height

          return unchanged ? current : nextRects
        })
      }
    }

    function syncLoop() {
      updateRects()
      frame = window.requestAnimationFrame(syncLoop)
    }

    updateRects()
    frame = window.requestAnimationFrame(syncLoop)
    window.addEventListener('resize', updateRects)
    window.addEventListener('scroll', updateRects, true)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateRects)
      window.removeEventListener('scroll', updateRects, true)
    }
  }, [isOnboardingOpen])

  function completeOnboarding() {
    writeOnboardingFlag(typeof window === 'undefined' ? null : window.localStorage)
    setIsOnboardingOpen(false)
  }

  return (
    <>
      <AppShell
        dock={
          <UtilitiesDock
            cameraButtonRef={cameraButtonRef}
            devices={webcam.devices}
            isMirrored={webcam.isMirrored}
            onOpenDeviceMenu={webcam.prepareDeviceSelection}
            onSelectDevice={webcam.selectDevice}
            onStart={webcam.start}
            onStop={webcam.stop}
            onToggleNativePointer={() => setNativePointerEnabled((enabled) => !enabled)}
            onToggleMirror={webcam.toggleMirror}
            nativePointerEnabled={nativePointerEnabled}
            pointerButtonRef={pointerButtonRef}
            selectedDeviceId={webcam.selectedDeviceId}
            startButtonRef={startButtonRef}
            status={webcam.status}
          />
        }
        statusPanel={<StatusPanel error={webcam.error} telemetry={telemetry} />}
      >
        <WebcamStage
          canvasRef={overlay.canvasRef}
          error={webcam.error}
          handDetected={handDetected}
          isMirrored={webcam.isMirrored}
          status={webcam.status}
          videoRef={webcam.videoRef}
        />
      </AppShell>

      {isOnboardingOpen ? (
        <OnboardingTour
          isOpen={isOnboardingOpen}
          onClose={completeOnboarding}
          onComplete={completeOnboarding}
          steps={onboardingSteps}
          targetRects={onboardingRects}
        />
      ) : null}
    </>
  )
}
