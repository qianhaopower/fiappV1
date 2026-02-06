import React from 'react'
import { Button } from '@/components/ui'

interface AppShellProps {
  children: React.ReactNode
  onSignOut?: () => void
}

/**
 * Application shell with top bar, navigation, and content container
 * Provides consistent padding and product layout across pages
 */
export function AppShell({ children, onSignOut }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/95 backdrop-blur relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-[-10%] h-40 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-semibold tracking-tight text-foreground">FIApp</div>
            <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <a className="hover:text-foreground transition-colors" href="/today">Today</a>
              <a className="hover:text-foreground transition-colors" href="/practices">Practices</a>
              <a className="hover:text-foreground transition-colors" href="/progress">Progress</a>
              <a className="hover:text-foreground transition-colors" href="/assessment">Assessment</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Account
            </Button>
            {onSignOut && (
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                Sign out
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {children}
      </main>
    </div>
  )
}
