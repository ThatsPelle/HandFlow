import type { HandTrackingSnapshot } from '../types/tracking'

export interface GesturePreparationFrame {
  candidateHandedness: string | null
  isReadyForGestureRecognition: boolean
  landmarkCount: number
  stableGestureName: string
}

export function prepareGestureFrame(snapshot: HandTrackingSnapshot): GesturePreparationFrame {
  return {
    candidateHandedness: snapshot.primaryHand?.handedness ?? null,
    isReadyForGestureRecognition: snapshot.status === 'detected' && snapshot.landmarkCount === 21,
    landmarkCount: snapshot.landmarkCount,
    stableGestureName: snapshot.gesture.name,
  }
}
