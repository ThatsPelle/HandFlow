import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import type { OnboardingStep, OnboardingStepId } from '../../utils/onboarding'

type TargetRects = Partial<Record<OnboardingStepId, DOMRect>>

interface OnboardingTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  steps: readonly OnboardingStep[]
  targetRects: TargetRects
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function OnboardingTour({ isOpen, onClose, onComplete, steps, targetRects }: OnboardingTourProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!isOpen || steps.length === 0) {
    return null
  }

  const step = steps[activeIndex]
  const targetRect = targetRects[step.id]
  const isLastStep = activeIndex === steps.length - 1
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 720 : window.innerHeight
  const cardWidth = Math.min(360, viewportWidth - 32)
  const defaultTop = Math.max(24, viewportHeight - 240)
  const cardLeft = targetRect
    ? clamp(targetRect.left + targetRect.width / 2 - cardWidth / 2, 16, viewportWidth - cardWidth - 16)
    : Math.max(16, (viewportWidth - cardWidth) / 2)
  const cardTop = targetRect
    ? clamp(targetRect.bottom + 18, 24, Math.max(24, viewportHeight - 230))
    : defaultTop

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="pointer-events-none fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="absolute inset-0 bg-[#02050ccc]/82 backdrop-blur-[2px]" />

        {targetRect ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-xl border border-cyan-core/60 shadow-[0_0_0_9999px_rgba(2,5,12,0.58),0_0_42px_rgba(34,211,238,0.28)]"
            initial={{ opacity: 0, scale: 0.96 }}
            style={{
              height: targetRect.height + 10,
              left: targetRect.left - 5,
              top: targetRect.top - 5,
              width: targetRect.width + 10,
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        ) : null}

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto absolute rounded-xl border border-white/10 bg-[#07111be8] p-5 text-slate-100 shadow-[0_18px_64px_rgba(0,0,0,0.42)] backdrop-blur"
          initial={{ opacity: 0, y: 10 }}
          style={{ left: cardLeft, top: cardTop, width: cardWidth }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.04 }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-soft">
                Quick start {activeIndex + 1}/{steps.length}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white">{step.title}</h2>
            </div>
            <button
              className="rounded border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:border-white/20 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm leading-6 text-slate-300">{step.body}</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              className="rounded border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/20 hover:text-white"
              onClick={onClose}
              type="button"
            >
              Skip
            </button>

            <button
              className="inline-flex items-center gap-2 rounded bg-cyan-core px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-950 shadow-glow transition hover:bg-cyan-soft"
              onClick={() => {
                if (isLastStep) {
                  onComplete()
                  return
                }

                setActiveIndex((current) => current + 1)
              }}
              type="button"
            >
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
