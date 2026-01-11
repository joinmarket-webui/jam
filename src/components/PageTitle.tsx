import { cn } from '@/lib/utils'

interface PageTitleProps {
  title: string
  subtitle?: string
  variant?: 'default' | 'success' | 'error'
  center?: boolean
}

const PageTitle = ({ title, subtitle, variant = 'default', center = false }: PageTitleProps) => {
  return (
    <div
      className={cn('flex flex-col', {
        'items-center': center,
        'text-destructive': variant === 'error',
      })}
    >
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground mb-2 text-sm">{subtitle}</p>}
    </div>
  )
}

export default PageTitle
