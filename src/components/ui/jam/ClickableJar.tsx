import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Jar } from './Jar'

interface ClickableJarProps extends ComponentProps<typeof Jar> {
  onClick?: () => void
}

export function ClickableJar({ onClick, className, ...jarProps }: ClickableJarProps) {
  return (
    <button className={cn('cursor-pointer transition-all duration-300 hover:scale-105', className)} onClick={onClick}>
      <Jar {...jarProps} />
    </button>
  )
}
