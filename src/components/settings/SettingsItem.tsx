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
  /**
   * Set when {@link children} already renders its own focusable control (e.g. a `Switch`).
   * The row then stays a plain wrapper instead of becoming a button, so a button is never
   * nested inside a button - keyboard users operate the child control directly.
   */
  hasInteractiveChild?: boolean
}>

export const SettingItem = ({
  icon: Icon,
  renderIcon,
  title,
  action,
  disabled = false,
  hasInteractiveChild = false,
  children,
}: SettingsItemProps) => {
  const className = cx('flex w-full min-w-0 items-center justify-between gap-2 py-2 text-left', {
    'hover:bg-muted/50 -mx-2 cursor-pointer rounded-md px-2': !disabled,
    'cursor-not-allowed opacity-60': disabled,
  })

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <div className="bg-muted/50 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border">
          {Icon && <Icon className="text-muted-foreground h-4 w-4 align-middle" />}
          {renderIcon?.({ className: 'text-muted-foreground h-4 w-4 align-middle' })}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{title}</p>
        </div>
      </div>
      {children !== undefined && <div className="shrink-0">{children}</div>}
    </>
  )

  // A row that is itself the control must be a real button: the browser then provides
  // focus, Enter/Space activation and the correct role for free.
  if (action && !hasInteractiveChild) {
    return (
      <button
        type="button"
        className={cx(className, 'appearance-none border-0 bg-transparent')}
        onClick={() => void action()}
        disabled={disabled}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={className} onClick={!disabled && action ? () => void action() : undefined}>
      {content}
    </div>
  )
}

type SettingsLinkProps = Omit<SettingsItemProps, 'action' | 'children' | 'hasInteractiveChild'> & {
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
      {external && <ExternalLinkIcon className="text-muted-foreground size-3.5" />}
    </SettingItem>
  )
}

type SettingsSwitchProps = Omit<SettingsItemProps, 'children' | 'action' | 'hasInteractiveChild'> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  displayToggle?: boolean
}
export const SettingSwitch = ({ checked, onCheckedChange, displayToggle = true, ...props }: SettingsSwitchProps) => {
  return (
    // With a visible toggle the `Switch` is the focusable control and the row stays a
    // wrapper. Without one the row itself has to be the button, or the setting cannot be
    // reached by keyboard at all.
    <SettingItem {...props} action={() => onCheckedChange?.(!checked)} hasInteractiveChild={displayToggle}>
      {displayToggle && <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={props.disabled} />}
    </SettingItem>
  )
}
