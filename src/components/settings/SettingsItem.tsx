import { ExternalLink, type LucideIcon } from 'lucide-react'

export const SettingItem = ({
  icon: Icon,
  title,
  action,
  disabled = false,
  external = false,
}: {
  icon: LucideIcon
  title: string
  action: () => void
  disabled?: boolean
  external?: boolean
}) => {
  const content = (
    <div
      className={`flex items-center justify-between py-2 ${disabled ? 'opacity-60' : ''} ${
        !disabled ? 'hover:bg-muted/50 -mx-2 cursor-pointer rounded-md px-2' : ''
      }`}
      onClick={!disabled ? action : undefined}
    >
      <div className="flex items-center gap-2">
        <div className="bg-muted/50 flex h-7 w-7 items-center justify-center rounded-lg border">
          <Icon className="text-muted-foreground h-3 w-3" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
        </div>
      </div>
      {external && <ExternalLink className="text-muted-foreground h-3 w-3" />}
    </div>
  )

  return content
}
