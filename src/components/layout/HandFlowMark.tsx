interface HandFlowMarkProps {
  className?: string
  compact?: boolean
}

export function HandFlowMark({ className, compact = false }: HandFlowMarkProps) {
  return (
    <div
      className={className ?? 'grid h-10 w-10 place-items-center rounded border border-cyan-core/40 bg-cyan-core/10 shadow-glow'}
    >
      <svg
        aria-hidden="true"
        className={compact ? 'h-4 w-4 text-cyan-soft' : 'h-5 w-5 text-cyan-soft'}
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M3.5 13.25h4.1l2.05-5.1 4.2 10.35 2.1-5.25h4.55"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    </div>
  )
}
