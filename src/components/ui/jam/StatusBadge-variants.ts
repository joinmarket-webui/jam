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
          className: 'bg-brand-success text-brand-success-foreground border-transparent',
        }),
        deposit: badgeVariants({ variant: 'default' }),
        used: badgeVariants({ variant: 'secondary' }),
        reused: badgeVariants({ variant: 'destructive', className: 'light:bg-destructive/70' }),
        'cj-out': badgeVariants({
          variant: 'default',
          className: 'bg-brand-success text-brand-success-foreground border-transparent',
        }),
        'cj-change': badgeVariants({
          variant: 'default',
          className: 'bg-brand-success/80 text-brand-success-foreground border-transparent',
        }),
        'change-out': badgeVariants({
          variant: 'default',
          className: 'bg-brand-warning text-brand-warning-foreground border-transparent',
        }),
        'non-cj-change': badgeVariants({
          variant: 'default',
          className: 'bg-brand-date text-white border-transparent',
        }),
        // TODO: style and verify "fidelity-bond, locked, pending and frozen" status tags
        'fidelity-bond': badgeVariants({ variant: 'outline' }),
        locked: badgeVariants({ variant: 'outline' }),
        pending: badgeVariants({
          variant: 'default',
          className: 'bg-brand-warning/30 text-brand-warning-foreground border-transparent',
        }),
        frozen: badgeVariants({
          variant: 'outline',
          className: 'bg-brand-info text-brand-info-foreground border-transparent',
        }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
