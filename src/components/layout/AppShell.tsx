import type { ReactNode } from 'react'
import { TopNavigation } from './TopNavigation'

interface AppShellProps {
  children: ReactNode
  dock: ReactNode
  statusPanel: ReactNode
}

export function AppShell({ children, dock, statusPanel }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-stage-radial" />
      <div className="pointer-events-none absolute inset-0 stage-grid opacity-30 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_76%,transparent)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNavigation />

        <main className="grid flex-1 grid-cols-1 gap-4 px-4 pb-36 sm:px-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-8">
          <section className="min-h-[58vh] lg:h-[calc(100svh-13rem)] lg:min-h-[420px]">
            {children}
          </section>
          {statusPanel}
        </main>

        {dock}
      </div>
    </div>
  )
}
