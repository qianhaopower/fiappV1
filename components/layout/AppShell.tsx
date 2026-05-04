'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { PlanBadge } from '@/components/PlanBadge'
import { DevSubscriptionToggle } from '@/components/DevSubscriptionToggle'
import { useProfile } from '@/contexts/ProfileContext'
import { getPlanLabel, isPlusPlan } from '@/lib/plans'

interface AppShellProps {
  children: React.ReactNode
  onSignOut?: () => void
}

const NAV_ITEMS = [
  { href: '/today', label: 'Today' },
  { href: '/practices', label: 'Practices' },
  { href: '/results', label: 'Insights' },
  { href: '/progress', label: 'Progress' },
]

function isActive(href: string, pathname: string | null) {
  return pathname === href || (pathname?.startsWith(href + '/') ?? false)
}

export function AppShell({ children, onSignOut }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthenticator((ctx) => [ctx.user])
  const { profile } = useProfile()

  const email = user?.signInDetails?.loginId ?? user?.username ?? ''
  const planLabel = getPlanLabel(profile?.subscriptionStatus)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    if (accountOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [accountOpen])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/95 backdrop-blur relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-[-10%] h-40 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/today" className="flex items-center gap-2 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" alt="Friends Intelligence" className="h-7 w-7 shrink-0" />
              <span className="hidden sm:inline font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors text-sm">
                Friends Intelligence
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive(href, pathname)
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground transition-colors'
                  }
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge />
            <DevSubscriptionToggle />
            <div ref={accountRef} className="relative hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAccountOpen((v) => !v)}
              >
                Account
              </Button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card shadow-md z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">{planLabel}</p>
                    {!isPlusPlan(profile?.subscriptionStatus) && (
                      <button
                        onClick={() => { setAccountOpen(false); toast.info('Plus plan is coming soon', { description: 'Plus lets you keep up to 10 active practices.' }) }}
                        className="mt-2 w-full rounded-md bg-primary/10 border border-primary/25 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors text-center"
                      >
                        Upgrade to Plus
                      </button>
                    )}
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setAccountOpen(false)}
                    className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    View account
                  </Link>
                  {onSignOut && (
                    <button
                      onClick={() => { setAccountOpen(false); onSignOut() }}
                      className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-t border-border/60"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="16" y2="16" />
                  <line x1="16" y1="2" x2="2" y2="16" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="5" x2="16" y2="5" />
                  <line x1="2" y1="9" x2="16" y2="9" />
                  <line x1="2" y1="13" x2="16" y2="13" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border/60 bg-card/95 px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={
                  isActive(href, pathname)
                    ? 'block px-3 py-2 rounded-md text-sm font-medium text-foreground bg-muted'
                    : 'block px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                }
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 pt-2 border-t border-border/60 flex flex-col gap-1">
              {onSignOut && (
                <button
                  onClick={() => { setMobileOpen(false); onSignOut(); }}
                  className="block w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Sign out
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {children}
      </main>
    </div>
  )
}
