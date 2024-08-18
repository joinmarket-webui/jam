import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Utxo } from '../../context/WalletContext'
import * as fb from '../fb/utils'
import Sprite from '../Sprite'
import styles from './UtxoIcon.module.css'

interface UtxoIconProps {
  value: Utxo
}

export default function UtxoIcon({ value }: UtxoIconProps) {
  const { t } = useTranslation()

  if (fb.utxo.isFidelityBond(value)) {
    return (
      <rb.OverlayTrigger
        overlay={(props) => (
          <rb.Tooltip {...props}>
            <div>{t('jar_details.utxo_list.utxo_tooltip_locktime', { locktime: value.locktime })}</div>
          </rb.Tooltip>
        )}
      >
        <div className={styles.utxoIcon}>
          <Sprite className={styles.iconLocked} symbol="timelock" width="20" height="20" />
        </div>
      </rb.OverlayTrigger>
    )
  } else if (value.frozen) {
    return (
      <div className={styles.utxoIcon}>
        <Sprite className={styles.iconFrozen} symbol="snowflake" width="20" height="20" />
      </div>
    )
  }
  return <></>
}
