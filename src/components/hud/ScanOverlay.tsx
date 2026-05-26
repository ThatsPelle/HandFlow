export function ScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-cyan-core/20 to-transparent" />
      <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-core/70 to-transparent" />
      <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-violet-core/60 to-transparent" />
      <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-cyan-soft/70 to-transparent" />
      <div className="absolute inset-x-6 bottom-6 h-px bg-gradient-to-r from-transparent via-violet-soft/60 to-transparent" />
    </div>
  )
}
