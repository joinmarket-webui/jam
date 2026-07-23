import { cva, type VariantProps } from 'class-variance-authority'
import type { JarIndex } from '@/types/global'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        dev: 'bg-brand-warning text-brand-warning-foreground border-transparent',
        jar0: 'border-transparent bg-jar0 text-primary-foreground [a&]:hover:bg-jar0/90',
        jar1: 'border-transparent bg-jar1 text-primary-foreground [a&]:hover:bg-jar1/90',
        jar2: 'border-transparent bg-jar2 text-primary-foreground [a&]:hover:bg-jar2/90',
        jar3: 'border-transparent bg-jar3 text-primary-foreground [a&]:hover:bg-jar3/90',
        jar4: 'border-transparent bg-jar4 text-primary-foreground [a&]:hover:bg-jar4/90',
        jarUnknown: 'border-transparent bg-jar-unknown text-primary-foreground [a&]:hover:bg-jar-unknown/90',
        muted: 'border-transparent bg-muted text-muted-foreground [a&]:hover:bg-muted/90',
        success: 'border-transparent bg-brand-success text-brand-success-foreground [a&]:hover:bg-brand-success/90',
        warning: 'border-transparent bg-brand-warning text-brand-warning-foreground [a&]:hover:bg-brand-warning/90',
        info: 'border-transparent bg-brand-info text-brand-info-foreground [a&]:hover:bg-brand-info/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const JAR_BADGE_VARIANTS: Record<JarIndex, BadgeVariant> = {
  0: 'jar0',
  1: 'jar1',
  2: 'jar2',
  3: 'jar3',
  4: 'jar4',
}

export const jarBadgeVariant = (jarIndex?: JarIndex): BadgeVariant | undefined =>
  jarIndex === undefined ? undefined : (JAR_BADGE_VARIANTS[jarIndex] ?? 'jarUnknown')
