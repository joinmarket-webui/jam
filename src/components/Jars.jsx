import React, { useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import styles from './Jars.module.css'
import Sprite from './Sprite'
import { calculateFillLevel, OpenableJar } from './jars/Jar'

const Jars = ({ accountBalances, totalBalance, onClick }) => {
  const { t } = useTranslation()
  const sortedAccountBalances = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

  const jarsDescriptionPopover = (
    <rb.Popover>
      <rb.Popover.Body>{t('current_wallet.jars_title_popover')}</rb.Popover.Body>
    </rb.Popover>
  )

  return (
    <div className="d-flex flex-column align-items-center gap-5">
      <rb.OverlayTrigger placement="right" overlay={jarsDescriptionPopover}>
        <div className={styles.jarsTitle}>
          <div>{t('current_wallet.jars_title')}</div>
          <Sprite className={styles.infoIcon} symbol="info" width="18" height="18" />
        </div>
      </rb.OverlayTrigger>
      <div className={styles.jarsContainer}>
        {sortedAccountBalances.map((account) => {
          const jarIsEmpty = parseInt(account.totalBalance, 10) === 0

          return (
            <OpenableJar
              key={account.accountIndex}
              index={account.accountIndex}
              balance={account.totalBalance}
              fillLevel={calculateFillLevel(account.totalBalance, totalBalance)}
              tooltipText={
                account.accountIndex === 0 && jarIsEmpty
                  ? t('current_wallet.jar_tooltip_empty_jar_0')
                  : t('current_wallet.jar_tooltip')
              }
              onClick={() => onClick(account.accountIndex)}
            />
          )
        })}
      </div>
    </div>
  )
}

export { Jars }
