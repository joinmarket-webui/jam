import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { satsToBtc } from '../utils'
import { AmountSats, BitcoinAddress } from '../libs/JmWalletApi'

interface BitcoinQRProps {
  address: BitcoinAddress
  sats: AmountSats
  errorCorrectionLevel: QRCode.QRCodeErrorCorrectionLevel
  width?: number
}

export const BitcoinQR = ({ address, sats, errorCorrectionLevel = 'H', width = 260 }: BitcoinQRProps) => {
  const [data, setData] = useState<string>()
  const [image, setImage] = useState<string>()

  useEffect(() => {
    const btc = satsToBtc(String(sats)) || 0
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
  }, [address, sats, errorCorrectionLevel, width])

  return (
    <div>
      <img src={image} alt={data} title={data} />
    </div>
  )
}
