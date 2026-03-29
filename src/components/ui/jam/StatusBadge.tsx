import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { statusBadgeVariants } from './StatusBadge-variants'

function StatusBadge({
  className,
  variant,
  asChild = false,
  tooltip,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof statusBadgeVariants> & {
    asChild?: boolean
    tooltip?: React.ReactNode | string
  }) {
  const Comp = asChild ? Slot : 'span'

  const element = <Comp data-slot="badge" className={cn(statusBadgeVariants({ variant }), className)} {...props} />

  return !tooltip ? (
    element
  ) : (
    <Tooltip key={props.key}>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export { StatusBadge }
