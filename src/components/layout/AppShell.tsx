import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { fetchRuntime, setRuntimeMode, type RunMode } from '@/lib/api'
import { cn } from '@/lib/format'

export function AppShell() {
  const { pathname } = useLocation()
  const isDetail = pathname.startsWith('/scenarios/')
  const [mode, setMode] = useState<RunMode>('test')

  useEffect(() => {
    let cancelled = false
    fetchRuntime()
      .then((body) => {
        if (!cancelled) setMode(body.mode)
      })
      .catch(() => {
        if (!cancelled) setMode('test')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function chooseMode(next: RunMode) {
    const previous = mode
    setMode(next)
    setRuntimeMode(next)
      .then((body) => setMode(body.mode))
      .catch(() => setMode(previous))
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f6f2] text-helm-900">
      <header className="sticky top-0 z-40 shrink-0 border-b border-helm-100/80 bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/helmsman-icon.png"
              alt="Helmsman"
              className="h-9 w-9 rounded-full object-cover shadow-sm"
            />
            <div>
              <p className="font-display text-sm font-semibold tracking-tight text-helm-600">
                Helmsman
              </p>
              <p className="text-xs text-helm-400">Automations</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-helm-50 text-helm-600'
                    : 'text-helm-400 hover:bg-helm-50 hover:text-helm-600',
                ].join(' ')
              }
            >
              Scenarios
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Run mode"
              className="flex rounded-full border border-helm-100 bg-helm-50 p-0.5"
            >
              <button
                type="button"
                aria-pressed={mode === 'test'}
                onClick={() => chooseMode('test')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  mode === 'test' ? 'bg-white text-helm-700 shadow-sm' : 'text-helm-400 hover:text-helm-600',
                )}
              >
                Test
              </button>
              <button
                type="button"
                aria-pressed={mode === 'production'}
                onClick={() => chooseMode('production')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  mode === 'production' ? 'bg-helm-600 text-white shadow-sm' : 'text-helm-400 hover:text-helm-600',
                )}
              >
                Production
              </button>
            </div>
            <img
              src="/images/helmsman-icon.png"
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      <main
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          isDetail
            ? 'min-h-0 overflow-hidden'
            : 'mx-auto w-full max-w-[1600px] overflow-auto px-4 py-6 sm:px-6',
        )}
      >
        <Outlet context={{ mode }} />
      </main>
    </div>
  )
}
