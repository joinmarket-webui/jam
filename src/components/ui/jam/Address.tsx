import { CheckIcon, CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { cn } from '@/lib/utils'
import type { BitcoinAddress } from '@/types/global'
import { buttonVariants } from '../button-variants'
import styles from './Address.module.css'
import { CopyButton } from './CopyButton'

type PlainAddressProps = {
  value: BitcoinAddress
  className?: string
  chunked?: boolean
}

const PlainAddress = ({ value, className, chunked }: PlainAddressProps) => {
  const chunks = chunked ? value.match(/.{1,4}/g) : [value]
  return (
    <span className={cn(styles.bitcoinAddress, chunked === true ? styles.chunked : undefined, className)}>
      {chunks?.map((it, index) => (
        <span key={index}>{it}</span>
      ))}
    </span>
  )
}

type CopyableAddressProps = PlainAddressProps

const CopyableAddress = (props: CopyableAddressProps) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <PlainAddress {...props} />
      <CopyButton
        value={props.value}
        text={<CopyIcon />}
        successText={<CheckIcon className="text-green-500" />}
        className={cn(buttonVariants({ variant: 'outline', size: 'icon-xs' }), 'shrink-0')}
        onSuccess={() => toast.success(t(/*TODO: i18n - distinct key */ 'receive.text_copy_address'))}
        onError={() => toast.error(/*TODO: i18n - distinct key */ t('receive.error_copy_address_failed'))}
      />
    </div>
  )
}

type AddressProps = CopyableAddressProps & {
  copyable?: boolean
}

export const Address = ({ chunked, copyable = true, ...props }: AddressProps) => {
  const displayContext = useJamDisplayContext()
  const isChunked = chunked ?? displayContext.addressChunkingEnabled === true
  return copyable ? <CopyableAddress {...props} chunked={isChunked} /> : <PlainAddress {...props} chunked={isChunked} />
}
