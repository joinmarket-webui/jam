import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { cn } from '@/lib/utils'

const Toaster = ({ theme, className, ...props }: ToasterProps) => {
  const { resolvedTheme = 'dark' } = useTheme()

  return (
    <Sonner
      theme={theme ?? (resolvedTheme as ToasterProps['theme'])}
      className={cn(
        'toaster group',
        {
          // workaround for sonner interaction in dialogs
          // see: https://github.com/shadcn-ui/ui/issues/3461 (last checked: 2026-02-07)
          'pointer-events-auto': true,
        },
        className,
      )}
      {...props}
    />
  )
}

export { Toaster }
