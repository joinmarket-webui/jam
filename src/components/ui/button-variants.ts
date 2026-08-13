import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { JarIndex } from '@/types/global'

const buttonVariants = cva(
  cn(
    "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
    'cursor-pointer disabled:cursor-not-allowed',
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'ghost-navbar': 'text-brand-nav-foreground/80 hover:text-brand-nav-foreground hover:bg-brand-nav-hover/80',
        destructive:
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        link: 'text-primary underline-offset-4 hover:underline',

        jar0: 'border-transparent bg-jar0 text-primary-foreground [a&]:hover:bg-jar0/90',
        jar1: 'border-transparent bg-jar1 text-primary-foreground [a&]:hover:bg-jar1/90',
        jar2: 'border-transparent bg-jar2 text-primary-foreground [a&]:hover:bg-jar2/90',
        jar3: 'border-transparent bg-jar3 text-primary-foreground [a&]:hover:bg-jar3/90',
        jar4: 'border-transparent bg-jar4 text-primary-foreground [a&]:hover:bg-jar4/90',
        jarUnknown: 'border-transparent bg-jar-unknown text-primary-foreground [a&]:hover:bg-jar-unknown/90',
      },
      size: {
        default: 'h-10 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xxl: 'h-12 gap-2 px-4 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
        icon: 'size-9',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
        'icon-xxl': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>

const JAR_BUTTON_VARIANTS: Record<JarIndex, ButtonVariant> = {
  0: 'jar0',
  1: 'jar1',
  2: 'jar2',
  3: 'jar3',
  4: 'jar4',
}

const jarButtonVariant = (jarIndex?: JarIndex): ButtonVariant | undefined =>
  jarIndex === undefined ? undefined : (JAR_BUTTON_VARIANTS[jarIndex] ?? 'jarUnknown')

export { buttonVariants, jarButtonVariant }
