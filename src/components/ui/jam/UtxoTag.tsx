import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { utxoTagVariants } from './UtxoTag-variants'

function UtxoTag({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof utxoTagVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return <Comp data-slot="badge" className={cn(utxoTagVariants({ variant }), className)} {...props} />
}

export { UtxoTag }
