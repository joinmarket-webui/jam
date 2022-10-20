import { useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../context/SettingsContext'
import { Utxo } from '../../context/WalletContext'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { CopyButton } from '../CopyButton'
import * as fb from './utils'
import styles from './ExistingFidelityBond.module.css'

interface ExistingFidelityBondProps {
  utxo: Utxo
}

const ExistingFidelityBond = ({ utxo }: ExistingFidelityBondProps) => {
  const settings = useSettings()
  const { t, i18n } = useTranslation()

  const isExpired = useMemo(() => !fb.utxo.isLocked(utxo), [utxo])

  if (!fb.utxo.isFidelityBond(utxo)) {
    return <></>
  }

  return (
    <div className={styles.container}>
      <div className="d-flex justify-content-between align-items-center">
        <div className={styles.title}>
          {t(`earn.fidelity_bond.existing.${isExpired ? 'title_expired' : 'title_active'}`)}
        </div>
        <div className="d-flex align-items-center gap-1">
          <Sprite symbol="coins" width="24" height="24" />
          <Balance
            valueString={utxo.value.toString()}
            convertToUnit={settings.unit}
            showBalance={settings.showBalance}
          />
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-start gap-4 px-3 mt-3">
        <Sprite
          className={styles.jar}
          symbol={isExpired ? 'jar-open-fill-25' : 'fb-filled'}
          width="46px"
          height="74px"
        />
        <div className="d-flex flex-column gap-3 w-75">
          {utxo.locktime && (
            <div className="d-flex align-items-center gap-2">
              <Sprite symbol="clock" width="18" height="18" className={styles.icon} />
              <div className="d-flex flex-column">
                <div className={styles.label}>
                  {t(`earn.fidelity_bond.existing.${isExpired ? 'label_expired_on' : 'label_locked_until'}`)}
                </div>
                <div className={styles.content}>
                  {utxo.locktime} (
                  {fb.time.humanReadableDuration({
                    to: new Date(utxo.locktime).getTime(),
                    locale: i18n.resolvedLanguage || i18n.language,
                  })}
                  )
                </div>
              </div>
            </div>
          )}
          <div className="d-flex align-items-center gap-2">
            <CopyButton
              showSprites={false}
              text={<Sprite symbol="copy" width="18" height="18" />}
              successText={<Sprite symbol="checkmark" width="18" height="18" />}
              value={utxo.address}
              className={styles.icon}
            />
            <div className="d-flex flex-column">
              <div className={styles.label}>{t('earn.fidelity_bond.existing.label_address')}</div>
              <div className={styles.content}>
                <code>{utxo.address}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ExistingFidelityBond }
