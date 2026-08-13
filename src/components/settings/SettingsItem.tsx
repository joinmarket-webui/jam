import type { PropsWithChildren, ReactNode } from 'react'
import { ExternalLinkIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

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

export const SettingsItem = ({
  icon: Icon,
  renderIcon,
  title,
  action,
  disabled = false,
  hasInteractiveChild = false,
  children,
}: SettingsItemProps) => {
  const rowClassName = cn('flex min-w-0 items-center justify-between gap-2 py-2', {
    'hover:bg-muted/50 cursor-pointer': !disabled && action,
    'rounded-md px-2': !disabled,
    'cursor-not-allowed opacity-60': disabled,
  })
  // The row bleeds into the card padding so the hover background spans the full width.
  // A block `div` with `width: auto` gets this from the negative margin alone, but a
  // `button` does not stretch to its parent, and once `w-full` pins the width the
  // negative margin no longer widens it. Keeping the bleed on a wrapper makes `w-full`
  // resolve against the widened box, so both variants end up the same size.
  const bleedClassName = !disabled ? '-mx-2' : undefined

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
      <div className={bleedClassName}>
        <button
          type="button"
          className={cn(rowClassName, 'w-full appearance-none border-0 bg-transparent text-left')}
          onClick={() => void action()}
          disabled={disabled}
        >
          {content}
        </button>
      </div>
    )
  }

  return (
    <div className={cn(bleedClassName, rowClassName)} onClick={!disabled && action ? () => void action() : undefined}>
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
    <SettingsItem
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
    </SettingsItem>
  )
}

type SettingsSwitchProps = Omit<SettingsItemProps, 'children' | 'action' | 'hasInteractiveChild'> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  displayToggle?: boolean
}
export const SettingsSwitch = ({ checked, onCheckedChange, displayToggle = true, ...props }: SettingsSwitchProps) => {
  return (
    // With a visible toggle the `Switch` is the focusable control and the row stays a
    // wrapper. Without one the row itself has to be the button, or the setting cannot be
    // reached by keyboard at all.
    <SettingsItem {...props} action={() => onCheckedChange?.(!checked)} hasInteractiveChild={displayToggle}>
      {displayToggle && <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={props.disabled} />}
    </SettingsItem>
  )
}
