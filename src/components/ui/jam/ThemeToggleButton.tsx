import type { ComponentProps } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ThemeToggleButtonProps = {
  theme: string
  variant: ComponentProps<typeof Button>['variant']
  onClick: ComponentProps<typeof Button>['onClick']
  className?: ComponentProps<typeof Button>['className']
}

export const ThemeToggleButton = ({ theme, variant, onClick, className }: ThemeToggleButtonProps) => {
  return (
    <Button
      size="icon"
      variant={variant}
      onClick={onClick}
      className={className}
      aria-label={/* TODO: i18n */ 'Toggle dark/light mode'}
      title={/* TODO: i18n */ 'Toggle dark/light mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
