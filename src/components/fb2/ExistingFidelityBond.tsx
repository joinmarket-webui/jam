import { PropsWithChildren, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { useSettings } from '../../context/SettingsContext'
import { Utxo } from '../../context/WalletContext'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { CopyButton } from '../CopyButton'
import * as fb from './utils'
import styles from './ExistingFidelityBond.module.css'
import * as Api from '../../libs/JmWalletApi'
import * as rb from 'react-bootstrap'

interface ExistingFidelityBondProps {
  fidelityBond: Utxo
}

const ExistingFidelityBond = ({ fidelityBond, children }: PropsWithChildren<ExistingFidelityBondProps>) => {
  const settings = useSettings()
  const { t, i18n } = useTranslation()

  const isExpired = useMemo(() => !fb.utxo.isLocked(fidelityBond), [fidelityBond])
  const humanReadableLockDuration = useMemo(() => {
    const locktime = fb.utxo.getLocktime(fidelityBond)
    if (!locktime) return '-'
    return fb.time.humanReadableDuration({
      to: locktime,
      locale: i18n.resolvedLanguage || i18n.language,
    })
  }, [i18n, fidelityBond])

  if (!fb.utxo.isFidelityBond(fidelityBond)) {
    return <></>
  }

  return (
    <div
      className={classNames(styles.container, {
        [styles.expired]: isExpired,
      })}
    >
      <div className="d-flex justify-content-between align-items-center">
        {isExpired ? (
          <div className={styles.titleExpired}>
            <Trans i18nKey="earn.fidelity_bond.existing.title_expired">
              Fidelity Bond <strong>expired</strong>
            </Trans>
          </div>
        ) : (
          <div className={styles.title}>
            <Trans i18nKey="earn.fidelity_bond.existing.title_active">
              <strong>Active</strong> Fidelity Bond
            </Trans>
          </div>
        )}
        <div className="d-flex align-items-center gap-1">
          <Sprite symbol="coins" width="24" height="24" />
          <Balance
            valueString={fidelityBond.value.toString()}
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
        <div className="d-flex flex-column gap-3">
          <div className="d-flex align-items-center gap-2">
            <Sprite symbol="clock" width="18" height="18" className={styles.icon} />
            <div className="d-flex flex-column">
              <div className={styles.label}>
                {t(`earn.fidelity_bond.existing.${isExpired ? 'label_expired_on' : 'label_locked_until'}`)}
              </div>
              <div className={styles.content}>
                {fidelityBond.locktime} ({humanReadableLockDuration})
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <CopyButton
              text={<Sprite symbol="copy" width="18" height="18" />}
              successText={<Sprite symbol="checkmark" width="18" height="18" />}
              value={fidelityBond.address}
              className={styles.icon}
            />
            <div className="d-flex flex-column">
              <div className={styles.label}>{t('earn.fidelity_bond.existing.label_address')}</div>
              <div className={styles.content}>
                <code>{fidelityBond.address}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

interface CreatingFidelityBondProps {
  timelockedAddress: Api.BitcoinAddress | undefined
  lockDate: Api.Lockdate | null
  amount: Api.AmountSats
}

const CreatingFidelityBond = ({ timelockedAddress, lockDate, amount }: CreatingFidelityBondProps) => {
  const settings = useSettings()
  const { t } = useTranslation()

  // const humanReadableLockDuration = useMemo(() => {
  //   const locktime = fb.utxo.getLocktime(fidelityBond)
  //   if (!locktime) return '-'
  //   return fb.time.humanReadableDuration({
  //     to: locktime,
  //     locale: i18n.resolvedLanguage || i18n.language,
  //   })
  // }, [i18n, fidelityBond])

  return (
    <div className={classNames(styles.creatingContainer)}>
      <div className="d-flex justify-content-between align-items-center">
        <div className={styles.creatingTitle}>
          <strong>Creating </strong> Fidelity Bond
        </div>
        <div className="d-flex align-items-center gap-1">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-start gap-4 px-3 mt-3">
        <Sprite className={styles.jar} symbol={'fb-filled'} width="46px" height="74px" />
        <div className="d-flex flex-column gap-3">
          <div className="d-flex align-items-center gap-2">
            <Sprite symbol="coins" width="24" height="24" />
            <div className="d-flex flex-column">
              <div className={styles.label}>Amount</div>
              <div className={styles.content}>
                <Balance
                  valueString={amount.toString()}
                  convertToUnit={settings.unit}
                  showBalance={settings.showBalance}
                />
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Sprite symbol="clock" width="18" height="18" className={styles.icon} />
            <div className="d-flex flex-column">
              <div className={styles.label}>{t(`earn.fidelity_bond.existing.${'label_locked_until'}`)}</div>
              <div className={styles.content}>{lockDate}</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <CopyButton
              text={<Sprite symbol="copy" width="18" height="18" />}
              successText={<Sprite symbol="checkmark" width="18" height="18" />}
              value={timelockedAddress!}
              className={styles.icon}
            />
            <div className="d-flex flex-column">
              <div className={styles.label}>{t('earn.fidelity_bond.existing.label_address')}</div>
              <div className={styles.content}>
                <code>{timelockedAddress}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ExistingFidelityBond, CreatingFidelityBond }
