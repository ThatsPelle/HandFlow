import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { WebcamDevice } from '../../types/tracking'
import { cn } from '../../utils/cn'

interface WebcamDeviceButtonProps {
  buttonRef?: RefObject<HTMLButtonElement | null>
  devices: WebcamDevice[]
  isBusy: boolean
  selectedDeviceId: string | null
  onSelect: (deviceId: string) => void
}

export function WebcamDeviceButton({
  buttonRef,
  devices,
  isBusy,
  selectedDeviceId,
  onSelect,
}: WebcamDeviceButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId) ?? null

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          'inline-flex min-h-11 items-center justify-center rounded border px-4 transition',
          isOpen || selectedDevice
            ? 'border-cyan-core/40 bg-cyan-core/12 text-cyan-soft'
            : 'border-white/10 bg-white/[0.04] text-slate-200',
        )}
        disabled={isBusy}
        onClick={() => setIsOpen((open) => !open)}
        title={selectedDevice ? `Webcam: ${selectedDevice.label}` : 'Select webcam'}
        type="button"
      >
        <Camera className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-[calc(100%+0.75rem)] left-0 z-30 w-72 overflow-hidden rounded-lg border border-white/10 bg-[#081019]/96 shadow-[0_22px_64px_rgba(0,0,0,0.45)] backdrop-blur"
            initial={{ opacity: 0, y: 8 }}
            role="menu"
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="border-b border-white/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-soft">
              Webcam device
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {devices.length > 0 ? (
                devices.map((device) => {
                  const isSelected = device.deviceId === selectedDeviceId

                  return (
                    <button
                      key={device.deviceId}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-sm transition',
                        isSelected
                          ? 'bg-cyan-core/12 text-cyan-soft'
                          : 'text-slate-200 hover:bg-white/[0.05] hover:text-white',
                      )}
                      onClick={() => {
                        onSelect(device.deviceId)
                        setIsOpen(false)
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <span className="truncate">{device.label}</span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  )
                })
              ) : (
                <div className="px-3 py-4 text-sm text-slate-400">No webcam devices found.</div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
