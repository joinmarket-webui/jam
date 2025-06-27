import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { satsToBtc } from '@/lib/utils'
import { Button } from '../ui/button'

interface BitcoinQRProps {
  address: string
  amount?: number
  errorCorrectionLevel?: QRCode.QRCodeErrorCorrectionLevel
  width?: number
}

export const BitcoinQR = ({ address, amount, errorCorrectionLevel = 'H', width = 260 }: BitcoinQRProps) => {
  const [data, setData] = useState<string>()
  const [image, setImage] = useState<string>()
  const [isHovering, setIsHovering] = useState(false)

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
    toast.success('QR code downloaded')
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: width, width: width }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {image && (
        <>
          <img
            src={image}
            alt={data}
            title={data}
            className={`transition-all duration-100 ${isHovering ? 'blur-[2px]' : ''}`}
          />
          {isHovering && (
            <Button
              variant={'secondary'}
              className="absolute flex cursor-pointer items-center justify-center"
              onClick={downloadQR}
              aria-label="Download QR Code"
            >
              <Download size={18} />
              Download QR
            </Button>
          )}
        </>
      )}
    </div>
  )
}
