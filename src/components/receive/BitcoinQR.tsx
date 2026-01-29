import { useEffect, useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn, satsToBtc } from '@/lib/utils'
import type { AmountSats, BitcoinAddress } from '@/types/global'

const DEFAULT_ERROR_CORRECTION: QRCode.QRCodeErrorCorrectionLevel = 'high'
const DEFAULT_IMAGE_MEDIA_TYPE: QRCode.QRCodeDataURLType = 'image/png'

interface BitcoinQRProps {
  className?: string
  width: number
  address: BitcoinAddress
  amount?: AmountSats
  errorCorrectionLevel?: QRCode.QRCodeErrorCorrectionLevel
  type?: QRCode.QRCodeDataURLType
}

export const BitcoinQR = ({
  className,
  width,
  address,
  amount,
  errorCorrectionLevel = DEFAULT_ERROR_CORRECTION,
  type = DEFAULT_IMAGE_MEDIA_TYPE,
}: BitcoinQRProps) => {
  const { t } = useTranslation()
  const [data, setData] = useState<string>()
  const [imageDataUrl, setImageDataUrl] = useState<string>()

  useEffect(() => {
    const btc = amount ? satsToBtc(String(amount)) || 0 : 0
    const uri = `bitcoin:${address}${btc > 0 ? `?amount=${btc.toFixed(8)}` : ''}`

    const abortCtrl = new AbortController()
    QRCode.toDataURL(uri, {
      type,
      errorCorrectionLevel,
      width,
    })
      .then((val) => {
        if (abortCtrl.signal.aborted) return
        setImageDataUrl(val)
        setData(uri)
      })
      .catch(() => {
        if (abortCtrl.signal.aborted) return
        setImageDataUrl(undefined)
        setData(uri)
      })

    return () => abortCtrl.abort()
  }, [address, amount, errorCorrectionLevel, width, type])

  return (
    <div
      className={cn('group/qrcode relative flex items-center justify-center', className)}
      style={{ height: width, width: width }}
    >
      {imageDataUrl && (
        <>
          <img
            className="transition-all duration-500 group-hover/qrcode:blur-[2px]"
            src={imageDataUrl}
            alt={data}
            title={data}
          />
          <Button
            variant="secondary"
            className="absolute hidden items-center justify-center group-hover/qrcode:flex"
            aria-label={t('receive.button_download_qr')}
            asChild
          >
            <a href={imageDataUrl} type={type} download={`bitcoin-qr-${address}.png`}>
              <DownloadIcon className="motion-safe:animate-bounce" />
              {t('receive.button_download_qr')}
            </a>
          </Button>
        </>
      )}
    </div>
  )
}
