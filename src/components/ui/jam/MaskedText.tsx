import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface MaskedTextProps {
  className?: string
  masked: boolean
  maskedText?: React.ReactNode | string
}

export const MaskedText = ({
  children,
  className,
  masked,
  maskedText = 'masked',
}: PropsWithChildren<MaskedTextProps>) => {
  return (
    <span
      className={cn(className, {
        'blur-[4px]': masked,
      })}
    >
      {masked ? maskedText : children}
    </span>
  )
}
