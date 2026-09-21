import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageTitleProps {
  title: string | ReactNode
  subtitle?: string
  variant?: 'default' | 'success' | 'error'
  center?: boolean
}

const PageTitle = ({
  title,
  subtitle,
  variant = 'default',
  center = false,
  children,
}: PropsWithChildren<PageTitleProps>) => {
  return (
    <div className={cn('flex flex-col gap-2', center ? 'items-center' : 'items-start sm:flex-row sm:items-center')}>
      <div
        className={cn('flex flex-1 flex-col', {
          'items-center': center,
          'text-destructive': variant === 'error',
        })}
      >
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className={cn('text-muted-foreground mb-2 text-sm', center ? 'text-center' : 'text-balance')}>
            {subtitle}
          </p>
        )}
      </div>

      {children && <div className="flex justify-end">{children}</div>}
    </div>
  )
}

export default PageTitle
