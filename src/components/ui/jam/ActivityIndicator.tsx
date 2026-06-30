import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type ActivityIndicatorProps = {
  active?: boolean
  animateEnter?: boolean
  className?: string
}

export const ActivityIndicator = ({ active = true, animateEnter = false, className }: ActivityIndicatorProps) => {
  return (
    <span
      className={cn('relative flex size-2', className, {
        hidden: !active,
        'animate-in fade-in-0 zoom-in-0 duration-2000': animateEnter,
      })}
    >
      <span className="bg-brand-success/30 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 [animation-duration:_2.1s]" />
      <span className="bg-brand-success relative inline-flex size-2 rounded-full" />
    </span>
  )
}

export const WithActivityIndicator = ({ children, ...props }: PropsWithChildren<ActivityIndicatorProps>) => {
  return (
    <span className="relative">
      {children}
      <ActivityIndicator animateEnter {...props} className={cn('absolute -top-0.5 -right-3', props.className)} />
    </span>
  )
}
