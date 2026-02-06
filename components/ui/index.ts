/**
 * FIApp UI Component Library
 * 
 * All components are from shadcn/ui (Radix UI + Tailwind CSS)
 * Styled with FIApp's calm, professional theme
 * 
 * Usage:
 * import { Button, Input, Label } from '@/components/ui'
 */

export { Button } from './button'
export { Input } from './input'
export { Label } from './label'
export { Checkbox } from './checkbox'
export { Switch } from './switch'
export { Textarea } from './textarea'
export { Skeleton } from './skeleton'
export { Card as BaseCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './dialog'
export { Toaster } from './sonner'
export {
  PageHeader,
  Section,
  Card,
  StatCard,
  EmptyState,
  ToastTrigger,
  ConfirmDialog,
  SkeletonList,
  SkeletonCard,
  SkeletonPage,
} from './content-primitives'
export { 
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select'
