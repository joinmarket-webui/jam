import type { ComponentProps } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type ThemeToggleButtonProps = {
  theme: string
  variant: ComponentProps<typeof Button>['variant']
  onClick: ComponentProps<typeof Button>['onClick']
  className?: ComponentProps<typeof Button>['className']
  tooltipSide?: ComponentProps<typeof TooltipContent>['side']
}

export const ThemeToggleButton = ({ theme, variant, onClick, className, tooltipSide }: ThemeToggleButtonProps) => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={variant}
          onClick={onClick}
          className={className}
          aria-label={theme === 'dark' ? t('settings.use_light_theme') : t('settings.use_dark_theme')}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        {theme === 'dark' ? t('settings.use_light_theme') : t('settings.use_dark_theme')}
      </TooltipContent>
    </Tooltip>
  )
}
