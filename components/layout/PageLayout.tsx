import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  metaLabel?: string
}

/**
 * Standard page layout for FIApp pages
 * Provides consistent header, spacing, and max-width
 * 
 * Usage:
 * <PageLayout title="Profile" description="Manage your profile">
 *   <YourContent />
 * </PageLayout>
 */
export function PageLayout({ title, description, metaLabel = 'PAGE', children }: PageLayoutProps) {
  return (
    <div>
      {/* Page Header */}
      <div className="border-b border-border/60 pb-8 mb-10">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {metaLabel}
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-3 text-lg text-muted-foreground max-w-2xl">{description}</p>}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}

/**
 * Section wrapper for organizing page content
 * Provides consistent spacing and heading style
 * 
 * Usage:
 * <PageSection title="Settings" description="Configure your preferences">
 *   <Content />
 * </PageSection>
 */
interface PageSectionProps {
  children: React.ReactNode
  title: string
  description?: string
  metaLabel?: string
}

export function PageSection({ title, description, metaLabel = 'SECTION', children }: PageSectionProps) {
  return (
    <section className="mb-10 pb-10 border-b border-border/50 last:border-b-0 last:pb-0">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {metaLabel}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/**
 * Card wrapper for grouping related content
 * Provides consistent styling and spacing
 * 
 * Usage:
 * <PageCard>
 *   <Form />
 * </PageCard>
 */
interface PageCardProps {
  children: React.ReactNode
  className?: string
}

export function PageCard({ children, className = '' }: PageCardProps) {
  return (
    <div className={`bg-card rounded-xl border border-border shadow-sm p-6 ${className}`}>
      {children}
    </div>
  )
}
