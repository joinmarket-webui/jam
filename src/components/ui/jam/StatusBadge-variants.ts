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
          className: 'bg-brand-info/70 text-brand-info-foreground border-transparent',
        }),
        deposit: badgeVariants({ variant: 'default' }),
        reused: badgeVariants({ variant: 'destructive' }),
        'cj-out': badgeVariants({
          variant: 'default',
          className: 'bg-brand-success/20 text-brand-success border-brand-success',
        }),
        'cj-change': badgeVariants({
          variant: 'default',
          className: 'bg-brand-date/20 text-brand-date border-brand-date',
        }),
        'non-cj-change': badgeVariants({
          variant: 'default',
          className: 'bg-brand-date text-white border-transparent',
        }),
        'used-empty': badgeVariants({
          variant: 'default',
          className: 'bg-brand-warning/50 text-brand-warning-foreground border-transparent',
        }),
        bond: badgeVariants({
          variant: 'outline',
          className: 'light:border-black/70 dark:border-white/70',
        }),
        reserved: badgeVariants({
          variant: 'default',
          className: 'bg-brand-warning/50 text-brand-warning-foreground border-transparent',
        }),
        flagged: badgeVariants({
          variant: 'default',
          className: 'bg-destructive/20 text-destructive border-destructive',
        }),
        // TODO: style and verify "pending and frozen" status tags
        pending: badgeVariants({
          variant: 'default',
          className: 'bg-brand-warning/50 text-brand-warning-foreground border-transparent',
        }),
        frozen: badgeVariants({
          variant: 'default',
          className: 'bg-brand-info text-brand-info-foreground border-transparent',
        }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
