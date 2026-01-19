import { cva } from 'class-variance-authority'
import { badgeVariants } from '../badge-variants'

export const statusBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: badgeVariants({ variant: 'default' }),
        new: badgeVariants({
          variant: 'default',
          className: 'border-green-900/50 light:border-transparent light:bg-green-900/60 bg-green-900/30 text-white/90',
        }),
        deposit: badgeVariants({ variant: 'default' }),
        used: badgeVariants({ variant: 'secondary' }),
        reused: badgeVariants({ variant: 'destructive', className: 'light:bg-destructive/70' }),
        'cj-out': badgeVariants({
          variant: 'default',
          className: 'border-transparent light:bg-green-700 bg-green-700 text-white/90',
        }),
        'change-out': badgeVariants({
          variant: 'default',
          className: 'border-transparent light:bg-yellow-300 bg-yellow-400 text-black',
        }),
        'non-cj-change': badgeVariants({
          variant: 'default',
          className: 'border-transparent light:bg-orange-600/70 bg-orange-500/70 text-white',
        }),
        // TODO: style and verify "fidelity-bond, locked, pending and frozen" status tags
        'fidelity-bond': badgeVariants({ variant: 'outline' }),
        locked: badgeVariants({ variant: 'outline' }),
        pending: badgeVariants({
          variant: 'default',
          className: 'border-transparent light:bg-yellow-100/90 bg-yellow-100/90 text-black',
        }),
        frozen: badgeVariants({
          variant: 'outline',
          className: 'border-blue-600/40 light:border-transparent light:bg-blue-900/90 bg-blue-900/50 text-white',
        }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
