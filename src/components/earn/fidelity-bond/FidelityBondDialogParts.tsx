import type { ReactNode } from 'react'
import { CheckCircle2Icon, CheckIcon, CopyIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { jarBadgeVariant } from '@/components/ui/badge-variants'
import { buttonVariants } from '@/components/ui/button-variants'
import { Item, ItemTitle, ItemDescription, ItemContent, ItemMedia } from '@/components/ui/item'
import { Address } from '@/components/ui/jam/Address'
import { Balance } from '@/components/ui/jam/Balance'
import { CopyButton } from '@/components/ui/jam/CopyButton'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { AmountSats, JarIndex } from '@/types/global'

/** icon + title/subtitle block shown at the top of a wizard step */
export function StepIntro({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <Item className="bg-muted/50 rounded-lg">
      <ItemMedia variant="icon" className="bg-primary/10 rounded-lg">
        <Icon className="text-primary h-5 w-5" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{subtitle}</ItemDescription>
      </ItemContent>
    </Item>
  )
}

/** labeled summary card used on review/confirm steps */
export function InfoCard({
  label,
  highlight = false,
  children,
}: {
  label: string
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('rounded-lg p-4', highlight ? 'bg-primary/5 border-primary/20 border' : 'bg-muted/50')}>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      {children}
    </div>
  )
}

export function FidelityBondAmount({ value, className }: { value: AmountSats; className?: string }) {
  return <Balance valueString={String(value)} className={cn('font-mono text-2xl font-bold', className)} />
}

export function JarBadge({ jarIndex, name }: { jarIndex: JarIndex | undefined; name?: string }) {
  const { t } = useTranslation()
  return (
    <Badge variant={jarBadgeVariant(jarIndex)}>
      {name ? (
        <>
          {name} <span>#{jarIndex}</span>
        </>
      ) : (
        t('earn.fidelity_bond.review_inputs.label_jar_n', { jar: jarIndex })
      )}
    </Badge>
  )
}

export function ConfirmationToggle({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {t('earn.fidelity_bond.create_form.confirmation_toggle_title')}
        </Label>
        <p className="text-muted-foreground text-xs">
          {t('earn.fidelity_bond.create_form.confirmation_toggle_subtitle')}
        </p>
      </div>
    </div>
  )
}

/** labeled value with a copy-to-clipboard button, used on success steps */
export function CopyableField({
  label,
  value,
  copiedMessage,
}: {
  label: string
  value: string
  copiedMessage: string
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="bg-muted flex-1 rounded-lg p-3 font-mono text-xs break-all">{value}</code>
        <CopyButton
          value={value}
          text={<CopyIcon className="h-4 w-4" />}
          successText={<CheckIcon className="text-brand-success h-4 w-4" />}
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-10 w-10 shrink-0')}
          onSuccess={() => toast.success(copiedMessage)}
          onError={(error) => {
            const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
            toast.error(t('global.errors.error_copy_to_clipboard_failed', { reason }))
          }}
        />
      </div>
    </div>
  )
}

/** labeled read-only address preview, used on confirm steps */
export function AddressPreview({ label, address }: { label: string; address: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="bg-muted rounded-lg p-3">
        <Address className="text-xs" value={address} />
      </div>
    </div>
  )
}

export function InlineLoading({ text }: { text: string }) {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 py-4">
      <Spinner className="motion-reduce:hidden" />
      {text}
    </div>
  )
}

/** full-step spinner shown while a transaction is in flight */
export function PendingStep({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <Spinner className="h-16 w-16" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="text-primary h-6 w-6 animate-pulse" />
        </div>
      </div>
      <p className="mt-6 text-lg font-semibold">{title}</p>
      {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
    </div>
  )
}

export function SuccessHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center py-6">
      <div className="bg-brand-success/10 rounded-full p-4">
        <CheckCircle2Icon className="text-brand-success h-16 w-16" />
      </div>
      <p className="mt-4 text-xl font-bold">{title}</p>
      {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
    </div>
  )
}
