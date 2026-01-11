import { useEffect, useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn, satsToBtc } from '@/lib/utils'
import type { AmountSats, BitcoinAddress } from '@/types/global'

interface BitcoinQRProps {
  className?: string
  address: BitcoinAddress
  amount?: AmountSats
  errorCorrectionLevel?: QRCode.QRCodeErrorCorrectionLevel
  width?: number
}

export const BitcoinQR = ({ className, address, amount, errorCorrectionLevel = 'H', width = 260 }: BitcoinQRProps) => {
  const { t } = useTranslation()
  const [data, setData] = useState<string>()
  const [image, setImage] = useState<string>()

  useEffect(() => {
    const btc = amount ? satsToBtc(String(amount)) || 0 : 0
    const uri = `bitcoin:${address}${btc > 0 ? `?amount=${btc.toFixed(8)}` : ''}`

    QRCode.toDataURL(uri, {
      errorCorrectionLevel,
      width,
    })
      .then((val) => {
        setImage(val)
        setData(uri)
      })
      .catch(() => {
        setImage(undefined)
        setData(uri)
      })
  }, [address, amount, errorCorrectionLevel, width])

  const downloadQR = () => {
    if (!image) return

    const link = document.createElement('a')
    link.href = image
    link.download = `bitcoin-qr-${address}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div
      className={cn('group/qrcode relative flex items-center justify-center', className)}
      style={{ height: width, width: width }}
    >
      {image && (
        <>
          <img
            src={image}
            alt={data}
            title={data}
            className="transition-all duration-500 group-hover/qrcode:blur-[2px]"
          />
          <Button
            variant="secondary"
            className="absolute hidden items-center justify-center group-hover/qrcode:flex"
            onClick={downloadQR}
            aria-label={t('receive.button_download_qr')}
          >
            <DownloadIcon className="animate-bounce" />
            {t('receive.button_download_qr')}
          </Button>
        </>
      )}
    </div>
  )
}
