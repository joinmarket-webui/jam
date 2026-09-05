import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DownloadIcon } from 'lucide-react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { toBip21Uri } from '@/lib/bip21'
import { cn } from '@/lib/utils'
import type { AmountSats, BitcoinAddress } from '@/types/global'

const DEFAULT_ERROR_CORRECTION: QRCode.QRCodeErrorCorrectionLevel = 'high'
const DEFAULT_IMAGE_MEDIA_TYPE: QRCode.QRCodeDataURLType = 'image/png'

interface QrCodeComponentProps {
  value: string
  width: number
  errorCorrectionLevel?: QRCode.QRCodeErrorCorrectionLevel
  type?: QRCode.QRCodeDataURLType
  className?: string
  children?: (imageDataUrl: string) => ReactNode | undefined
}

const QrCodeComponent = ({
  className,
  width,
  value,
  errorCorrectionLevel = DEFAULT_ERROR_CORRECTION,
  type = DEFAULT_IMAGE_MEDIA_TYPE,
  children,
}: QrCodeComponentProps) => {
  const [data, setData] = useState<string>()
  const [imageDataUrl, setImageDataUrl] = useState<string>()

  useEffect(() => {
    const abortCtrl = new AbortController()
    QRCode.toDataURL(value, {
      type,
      errorCorrectionLevel,
      width,
    })
      .then((val) => {
        if (abortCtrl.signal.aborted) return
        setImageDataUrl(val)
        setData(value)
      })
      .catch(() => {
        if (abortCtrl.signal.aborted) return
        setImageDataUrl(undefined)
        setData(value)
      })

    return () => abortCtrl.abort()
  }, [value, errorCorrectionLevel, width, type])

  return (
    <div
      className={cn('group/qrcode relative flex aspect-square w-full items-center justify-center', className)}
      style={{ maxWidth: width }}
    >
      {imageDataUrl && (
        <>
          <img
            className={cn('h-full w-full transition-all duration-500', {
              'group-hover/qrcode:blur-[2px]': children !== undefined,
            })}
            src={imageDataUrl}
            alt={data}
            title={data}
          />
          {children?.(imageDataUrl)}
        </>
      )}
    </div>
  )
}

type BitcoinAddressQrCodeProps = Omit<QrCodeComponentProps, 'value' | 'children'> & {
  address: BitcoinAddress
  amount?: AmountSats
}

export const BitcoinAddressQrCode = ({ address, amount, type, ...props }: BitcoinAddressQrCodeProps) => {
  const { t } = useTranslation()

  const uri = useMemo(() => toBip21Uri({ address, amount }), [address, amount])

  return (
    <QrCodeComponent value={uri} type={type} {...props}>
      {(imageDataUrl) => (
        <Button
          variant="secondary"
          className="absolute hidden items-center justify-center group-hover/qrcode:flex"
          aria-label={t('receive.button_download_qr')}
          asChild
        >
          <a href={imageDataUrl} type={type} download={`bitcoin-address-qr-${address}.png`}>
            <DownloadIcon className="motion-safe:animate-bounce" />
            {t('receive.button_download_qr')}
          </a>
        </Button>
      )}
    </QrCodeComponent>
  )
}

type BitcoinXpubQrCodeProps = Omit<QrCodeComponentProps, 'value' | 'children'> & {
  xpub: string
}

export const BitcoinXpubQrCode = ({ xpub, ...props }: BitcoinXpubQrCodeProps) => (
  <QrCodeComponent value={xpub} {...props} />
)
