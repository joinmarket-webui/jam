import classNames from 'classnames'
import { Utxo } from '../../context/WalletContext'
import Sprite from '../Sprite'
import styles from './Confirmations.module.css'

interface UtxoConfirmationsProps {
  value: Utxo
}

export function UtxoConfirmations({ value }: UtxoConfirmationsProps) {
  const symbol = `confs-${value.confirmations >= 6 ? 'full' : value.confirmations}`

  return (
    <div className={classNames(styles.confirmations, styles[`confirmations-${value.confirmations}`])}>
      <Sprite symbol={symbol} width="20" height="20" />
      <div>{value.confirmations}</div>
    </div>
  )
}
