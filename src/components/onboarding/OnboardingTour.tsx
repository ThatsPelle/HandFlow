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
  const cardHeight = 214
  const defaultTop = Math.max(24, viewportHeight - 240)
  const placeBelow = targetRect ? targetRect.bottom + cardHeight + 32 <= viewportHeight : true
  const cardLeft = targetRect
    ? clamp(targetRect.left + targetRect.width / 2 - cardWidth / 2, 16, viewportWidth - cardWidth - 16)
    : Math.max(16, (viewportWidth - cardWidth) / 2)
  const cardTop = targetRect
    ? placeBelow
      ? clamp(targetRect.bottom + 24, 24, Math.max(24, viewportHeight - cardHeight - 24))
      : clamp(targetRect.top - cardHeight - 24, 24, Math.max(24, viewportHeight - cardHeight - 24))
    : defaultTop
  const leaderStart = targetRect
    ? {
        x: targetRect.left + targetRect.width / 2,
        y: placeBelow ? targetRect.bottom + 6 : targetRect.top - 6,
      }
    : null
  const leaderEnd = targetRect
    ? {
        x: clamp(cardLeft + cardWidth / 2, cardLeft + 32, cardLeft + cardWidth - 32),
        y: placeBelow ? cardTop - 8 : cardTop + cardHeight + 8,
      }
    : null
  const leaderMidY = leaderStart && leaderEnd ? (leaderStart.y + leaderEnd.y) / 2 : 0
  const leaderPath =
    leaderStart && leaderEnd
      ? `M ${leaderStart.x} ${leaderStart.y} C ${leaderStart.x} ${leaderMidY}, ${leaderEnd.x} ${leaderMidY}, ${leaderEnd.x} ${leaderEnd.y}`
      : null
  const spotlightRadius = 10

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="pointer-events-none fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {targetRect ? (
          <>
            <div
              className="absolute left-0 right-0 top-0 bg-[#02050ccc] backdrop-blur-[3px]"
              style={{ height: Math.max(0, targetRect.top) }}
            />
            <div
              className="absolute left-0 top-0 bg-[#02050ccc] backdrop-blur-[3px]"
              style={{
                height: targetRect.height,
                top: targetRect.top,
                width: Math.max(0, targetRect.left),
              }}
            />
            <div
              className="absolute right-0 top-0 bg-[#02050ccc] backdrop-blur-[3px]"
              style={{
                height: targetRect.height,
                top: targetRect.top,
                width: Math.max(0, viewportWidth - targetRect.right),
              }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 bg-[#02050ccc] backdrop-blur-[3px]"
              style={{ height: Math.max(0, viewportHeight - targetRect.bottom) }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#02050ccc] backdrop-blur-[3px]" />
        )}

        {targetRect ? (
          <>
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="absolute border border-cyan-core/70 bg-transparent shadow-[0_0_24px_rgba(34,211,238,0.3)]"
              initial={{ opacity: 0, scale: 0.96 }}
              style={{
                borderRadius: spotlightRadius,
                height: targetRect.height,
                left: targetRect.left,
                top: targetRect.top,
                width: targetRect.width,
              }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            />
            {leaderPath && leaderStart && leaderEnd ? (
              <svg className="absolute inset-0 h-full w-full" data-testid="onboarding-leader-line">
                <path
                  d={leaderPath}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.92)"
                  strokeDasharray="8 10"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />
                <circle cx={leaderStart.x} cy={leaderStart.y} fill="rgba(34, 211, 238, 0.96)" r="4" />
                <circle cx={leaderEnd.x} cy={leaderEnd.y} fill="rgba(34, 211, 238, 0.96)" r="4" />
              </svg>
            ) : null}
          </>
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
