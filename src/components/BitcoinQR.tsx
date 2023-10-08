import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { satsToBtc } from '../utils'
import { AmountSats, BitcoinAddress } from '../libs/JmWalletApi'

interface BitcoinQRProps {
  address: BitcoinAddress
  amount?: AmountSats
  errorCorrectionLevel?: QRCode.QRCodeErrorCorrectionLevel
  width?: number
}

export const BitcoinQR = ({ address, amount, errorCorrectionLevel = 'H', width = 260 }: BitcoinQRProps) => {
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

  return (
    <div>
      <img src={image} alt={data} title={data} />
    </div>
  )
}
