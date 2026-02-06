import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './dialog'
import { Skeleton } from './skeleton'
import { toast } from 'sonner'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ eyebrow = 'PAGE', title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-border/60 pb-8 mb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  description?: string
  label?: string
  children: React.ReactNode
}

export function Section({ title, description, label = 'SECTION', children }: SectionProps) {
  return (
    <section className="mb-12 pb-12 border-b border-border/50 last:border-b-0 last:pb-0">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <h2 className="mt-2 text-3xl font-bold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {children}
    </section>
  )
}

type CardVariant = 'default' | 'subtle' | 'interactive'

const cardVariants: Record<CardVariant, string> = {
  default: 'bg-card border border-border shadow-sm',
  subtle: 'bg-muted/30 border border-border/60 shadow-sm',
  interactive: 'bg-card border border-border shadow-sm hover:shadow-md transition-shadow',
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

export function Card({ variant = 'default', className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl p-6', cardVariants[variant], className)}
      {...props}
    />
  )
}

interface StatCardProps {
  label: string
  value: string | number
  helper?: string
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <Card variant="subtle" className="p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
      {helper && <p className="mt-1 text-sm text-muted-foreground">{helper}</p>}
    </Card>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  text?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <Card variant="subtle" className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        {icon || <span className="text-lg">○</span>}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  )
}

interface ToastTriggerProps {
  label?: string
  title?: string
  description?: string
}

export function ToastTrigger({
  label = 'Show Toast',
  title = 'Saved',
  description = 'Your changes have been saved.',
}: ToastTriggerProps) {
  return (
    <Button
      variant="secondary"
      onClick={() => toast(title, { description })}
    >
      {label}
    </Button>
  )
}

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description?: string
  confirmLabel?: string
  onConfirm?: () => void
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={onConfirm}>{confirmLabel}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <Card variant="subtle" className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </Card>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}
