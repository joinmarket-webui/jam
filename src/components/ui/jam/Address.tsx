import { CheckIcon, CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { BitcoinAddress } from '@/types/global'
import { buttonVariants } from '../button-variants'
import { CopyButton } from './CopyButton'

type PlainAddressProps = {
  value: BitcoinAddress
  className?: string
}

const PlainAddress = ({ value, className }: PlainAddressProps) => {
  return <span className={cn('font-mono break-all select-all', className)}>{value}</span>
}

type CopyableAddressProps = PlainAddressProps

const CopyableAddress = ({ value, className }: CopyableAddressProps) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <PlainAddress value={value} className={className} />
      <CopyButton
        value={value}
        text={<CopyIcon />}
        successText={<CheckIcon className="text-green-500" />}
        className={cn(buttonVariants({ variant: 'outline', size: 'icon-xs' }), 'shrink-0')}
        onSuccess={() => toast.success(t(/*TODO: i18n - distinct key */ 'receive.text_copy_address'))}
        onError={() => toast.error(/*TODO: i18n - distinct key */ t('receive.error_copy_address_failed'))}
      />
    </div>
  )
}

type AddressProps = {
  value: BitcoinAddress
  className?: string
  copyable?: boolean
}

export const Address = ({ value, className, copyable = true }: AddressProps) => {
  return copyable ? (
    <CopyableAddress value={value} className={className} />
  ) : (
    <PlainAddress value={value} className={className} />
  )
}
