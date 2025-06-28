import { ExternalLink, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const SettingItem = ({
  icon: Icon,
  title,
  action,
  isToggle = false,
  isActive = false,
  tooltip,
  disabled = false,
  clickable = false,
  external = false,
}: {
  icon: LucideIcon
  title: string
  action: () => void
  isToggle?: boolean
  isActive?: boolean
  tooltip?: string
  disabled?: boolean
  clickable?: boolean
  external?: boolean
}) => {
  const content = (
    <div
      className={`flex items-center justify-between py-2 ${disabled ? 'opacity-60' : ''} ${
        clickable && !disabled ? 'hover:bg-muted/50 -mx-2 cursor-pointer rounded-md px-2' : ''
      }`}
      onClick={clickable && !disabled ? action : undefined}
    >
      <div className="flex items-center gap-2">
        <div className="bg-muted/50 flex h-7 w-7 items-center justify-center rounded-lg border">
          <Icon className="text-muted-foreground h-3 w-3" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
        </div>
      </div>
      {isToggle ? (
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={action}
          disabled={disabled}
          className={`h-7 px-3 text-xs ${isActive ? 'bg-primary hover:bg-primary/90' : 'hover:bg-muted'}`}
          aria-label={`Toggle ${title}`}
        >
          {isActive ? 'On' : 'Off'}
        </Button>
      ) : external ? (
        clickable ? (
          <ExternalLink className="text-muted-foreground h-3 w-3" />
        ) : (
          <Button
            variant={'outline'}
            size="sm"
            onClick={action}
            disabled={disabled}
            className="h-7 w-7 p-0"
            aria-label={title}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )
      ) : null}
    </div>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
