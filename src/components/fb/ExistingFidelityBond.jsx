import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../context/SettingsContext'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { CopyButton } from '../CopyButton'
import * as fb from './utils'
import styles from './ExistingFidelityBond.module.css'

const ExistingFidelityBond = ({ utxo }) => {
  const settings = useSettings()
  const { i18n } = useTranslation()

  return (
    <div className={styles.container}>
      <div className="d-flex justify-content-between align-items-center">
        <div className={styles.title}>Fidelity Bond</div>
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
        <Sprite className={styles.jar} symbol="fb-filled" width="46px" height="74px" />
        <div className="d-flex flex-column gap-3 w-75">
          <div className="d-flex align-items-center gap-2">
            <Sprite symbol="clock" width="18" height="18" className={styles.icon} />
            <div className="d-flex flex-column">
              <div className={styles.label}>Locked until</div>
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
          <div className="d-flex align-items-center gap-2">
            <CopyButton
              showSprites={false}
              text={<Sprite symbol="copy" width="18" height="18" />}
              successText={<Sprite symbol="checkmark" width="18" height="18" />}
              value={utxo.address}
              className={styles.icon}
            />
            <div className="d-flex flex-column">
              <div className={styles.label}>Timelocked address</div>
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
