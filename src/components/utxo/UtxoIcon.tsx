import { PropsWithChildren, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Utxo } from '../../context/WalletContext'
import * as fb from '../fb/utils'
import { UtxoTag, UtxoStatus } from './utils'
import Sprite from '../Sprite'
import styles from './UtxoIcon.module.css'

const toIcon = (utxo: Utxo, tags?: UtxoStatus[]) => {
  if (fb.utxo.isFidelityBond(utxo)) return 'timelock'
  if (utxo.frozen) return 'snowflake'
  if (tags?.includes('cj-out')) return 'mixed'
  if (tags) return 'unmixed'
  return undefined
}

function LockedIconTooltip({ utxo, children }: PropsWithChildren<{ utxo: Utxo }>) {
  const { t } = useTranslation()

  return (
    <rb.OverlayTrigger
      overlay={(props) => (
        <rb.Tooltip {...props}>
          <div>{t('jar_details.utxo_list.utxo_tooltip_locktime', { locktime: utxo.locktime })}</div>
        </rb.Tooltip>
      )}
    >
      <div>{children}</div>
    </rb.OverlayTrigger>
  )
}

interface UtxoIconProps {
  value: Utxo
  tags?: UtxoTag[]
  size?: 20 | 24
}

export default function UtxoIcon({ value, tags, size = 24 }: UtxoIconProps) {
  const symbol = useMemo(
    () =>
      toIcon(
        value,
        tags?.map((it) => it.value),
      ),
    [value, tags],
  )

  const element = (
    <div className={styles.utxoIcon}>{symbol && <Sprite symbol={symbol} width={size} height={size} />}</div>
  )

  if (fb.utxo.isFidelityBond(value)) {
    return <LockedIconTooltip utxo={value}>{element}</LockedIconTooltip>
  }

  return element
}
