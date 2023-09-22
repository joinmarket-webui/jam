import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { satsToBtc } from '../utils'

export const BitcoinQR = ({ address, sats, errorCorrectionLevel = 'H', width = 260 }) => {
  const [data, setData] = useState(null)
  const [image, setImage] = useState(null)

  useEffect(() => {
    const btc = satsToBtc(parseInt(sats, 10)) || 0
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
        setImage(null)
        setData(uri)
      })
  }, [address, sats, errorCorrectionLevel, width])

  return (
    <div>
      <img src={image} alt={data} title={data} />
    </div>
  )
}
