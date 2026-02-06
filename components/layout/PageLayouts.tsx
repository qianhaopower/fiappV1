import React from 'react'
import { PageHeader } from '@/components/ui'

interface BasePageProps {
  title: string
  description?: string
  metaLabel?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

/**
 * StandardPage: title + optional description + right-side actions + content
 */
export function StandardPage({
  title,
  description,
  metaLabel = 'PAGE',
  actions,
  children,
}: BasePageProps) {
  return (
    <>
      <PageHeader
        eyebrow={metaLabel}
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </>
  )
}

/**
 * NarrowFormPage: centered, max width ~600px
 */
export function NarrowFormPage({
  title,
  description,
  metaLabel = 'FORM',
  actions,
  children,
}: BasePageProps) {
  return (
    <div className="max-w-[600px] mx-auto">
      <PageHeader
        eyebrow={metaLabel}
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </div>
  )
}

interface DashboardPageProps {
  title: string
  description?: string
  metaLabel?: string
  summary: React.ReactNode
  main: React.ReactNode
  actions?: React.ReactNode
}

/**
 * DashboardPage: two-column responsive grid (summary cards + main panel)
 */
export function DashboardPage({
  title,
  description,
  metaLabel = 'DASHBOARD',
  summary,
  main,
  actions,
}: DashboardPageProps) {
  return (
    <>
      <PageHeader
        eyebrow={metaLabel}
        title={title}
        description={description}
        actions={actions}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
        <aside className="space-y-6">{summary}</aside>
        <section className="min-w-0">{main}</section>
      </div>
    </>
  )
}

interface ListDetailPageProps {
  title: string
  description?: string
  metaLabel?: string
  list: React.ReactNode
  detail: React.ReactNode
  actions?: React.ReactNode
}

/**
 * ListDetailPage: left list / right detail
 */
export function ListDetailPage({
  title,
  description,
  metaLabel = 'LIBRARY',
  list,
  detail,
  actions,
}: ListDetailPageProps) {
  return (
    <>
      <PageHeader
        eyebrow={metaLabel}
        title={title}
        description={description}
        actions={actions}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-8">
        <aside className="space-y-4">{list}</aside>
        <section className="min-w-0">{detail}</section>
      </div>
    </>
  )
}
