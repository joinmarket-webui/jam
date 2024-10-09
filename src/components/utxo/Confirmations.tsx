import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import classNames from 'classnames'
import { Utxo } from '../../context/WalletContext'
import Sprite from '../Sprite'
import styles from './Confirmations.module.css'

interface ConfirmationFormat {
  symbol: string
  display: string
  tooltip?: string
  confirmations: number
}

const formatConfirmations = (confirmations: number): ConfirmationFormat => ({
  symbol: `confs-${confirmations >= 6 ? 'full' : confirmations}`,
  display: confirmations > 9999 ? `${Number(9999).toLocaleString()}+` : confirmations.toLocaleString(),
  tooltip: confirmations > 9999 ? confirmations.toLocaleString() : undefined,
  confirmations,
})

export function Confirmations({ className, value }: { className?: string; value: ConfirmationFormat }) {
  return value.tooltip !== undefined ? (
    <OverlayTrigger
      popperConfig={{
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 1],
            },
          },
        ],
      }}
      overlay={(props) => <Tooltip {...props}>{value.tooltip}</Tooltip>}
    >
      <div className={classNames(className, styles.confirmations, styles[`confirmations-${value.confirmations}`])}>
        <Sprite symbol={value.symbol} width="20" height="20" />
        <div>{value.display}</div>
      </div>
    </OverlayTrigger>
  ) : (
    <div className={classNames(className, styles.confirmations, styles[`confirmations-${value.confirmations}`])}>
      <Sprite symbol={value.symbol} width="20" height="20" />
      <div>{value.display}</div>
    </div>
  )
}

export function UtxoConfirmations({ className, value }: { className?: string; value: Utxo }) {
  return <Confirmations className={className} value={formatConfirmations(value.confirmations)} />
}
