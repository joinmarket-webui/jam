import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { statusBadgeVariants } from './StatusBadge-variants'

function StatusBadge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return <Comp data-slot="badge" className={cn(statusBadgeVariants({ variant }), className)} {...props} />
}

export { StatusBadge }
