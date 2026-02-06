import type { PropsWithChildren, ReactNode } from 'react'
import { cx } from 'class-variance-authority'
import { ExternalLinkIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Switch } from '@/components/ui/switch'

type SettingsItemProps = PropsWithChildren<{
  icon?: LucideIcon
  renderIcon?: ({ className }: { className: string }) => ReactNode
  title: string
  disabled?: boolean
  action?: () => void | Promise<void>
}>

export const SettingItem = ({
  icon: Icon,
  renderIcon,
  title,
  action,
  disabled = false,
  children,
}: SettingsItemProps) => {
  const content = (
    <div
      className={cx('flex items-center justify-between py-2', {
        'hover:bg-muted/50 -mx-2 cursor-pointer rounded-md px-2': !disabled,
        'cursor-not-allowed opacity-60': disabled,
      })}
      onClick={!disabled && action ? () => void action() : undefined}
    >
      <div className="flex items-center gap-2">
        <div className="bg-muted/50 flex h-7 w-7 items-center justify-center rounded-lg border">
          {Icon && <Icon className="text-muted-foreground h-4 w-4" />}
          {renderIcon && renderIcon({ className: 'text-muted-foreground h-4 w-4' })}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
        </div>
      </div>
      {children}
    </div>
  )

  return content
}

type SettingsLinkProps = Omit<SettingsItemProps, 'action' | 'children'> & {
  to: string
  external?: boolean
}

export const SettingsLink = ({ to, external = false, ...props }: SettingsLinkProps) => {
  const navigate = useNavigate()

  return (
    <SettingItem
      {...props}
      action={async () => {
        if (external) {
          window.open(to, '_blank', 'noreferrer,noopener')
        } else {
          await navigate(to)
        }
      }}
    >
      {external && <ExternalLinkIcon className="text-muted-foreground h-3 w-3" />}
    </SettingItem>
  )
}

type SettingsSwitchProps = Omit<SettingsItemProps, 'children' | 'action'> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  displayToggle?: boolean
}
export const SettingSwitch = ({ checked, onCheckedChange, displayToggle = true, ...props }: SettingsSwitchProps) => {
  return (
    <SettingItem {...props} action={() => onCheckedChange && onCheckedChange(!checked)}>
      {displayToggle && <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={props.disabled} />}
    </SettingItem>
  )
}
