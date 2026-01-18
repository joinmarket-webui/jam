import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { badgeVariants } from '../badge-variants'

export const utxoTagVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: badgeVariants({ variant: 'default' }),
        new: badgeVariants({ variant: 'default' }),
        deposit: badgeVariants({ variant: 'default' }),
        used: badgeVariants({ variant: 'secondary' }),
        reused: badgeVariants({ variant: 'destructive' }),
        'cj-out': cn(
          badgeVariants({ variant: 'default' }),
          'border-transparent light:bg-green-400 bg-green-300 text-black',
        ),
        'change-out': cn(
          badgeVariants({ variant: 'default' }),
          'border-transparent light:bg-yellow-300 bg-yellow-400 text-black',
        ),
        'non-cj-change': cn(
          badgeVariants({ variant: 'default' }),
          'border-transparent light:bg-yellow-300 bg-yellow-400 text-black',
        ),
        'fidelity-bond': badgeVariants({ variant: 'outline' }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
