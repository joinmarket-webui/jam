import { useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { AccountBalances } from '../context/BalanceSummary'
import { AmountSats } from '../libs/JmWalletApi'
import { OpenableJar, jarFillLevel } from './jars/Jar'
import Sprite from './Sprite'

import styles from './Jars.module.css'

interface JarsProps {
  accountBalances: AccountBalances
  totalBalance: AmountSats
  onClick: (jarIndex: JarIndex) => void
}

const Jars = ({ accountBalances, totalBalance, onClick }: JarsProps) => {
  const { t } = useTranslation()
  const sortedAccountBalances = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

  return (
    <div className="d-flex flex-column align-items-center gap-5">
      <rb.OverlayTrigger
        placement="right"
        overlay={
          <rb.Popover>
            <rb.Popover.Body>{t('current_wallet.jars_title_popover')}</rb.Popover.Body>
          </rb.Popover>
        }
      >
        <div className={styles.jarsTitle}>
          <div>{t('current_wallet.jars_title')}</div>
          <Sprite className={styles.infoIcon} symbol="info" width="18" height="18" />
        </div>
      </rb.OverlayTrigger>
      <div className={styles.jarsContainer}>
        {sortedAccountBalances.map((account) => {
          const jarIsEmpty = account.calculatedTotalBalanceInSats === 0

          return (
            <OpenableJar
              key={account.accountIndex}
              index={account.accountIndex}
              balance={account.calculatedAvailableBalanceInSats}
              frozenBalance={account.calculatedFrozenOrLockedBalanceInSats}
              fillLevel={jarFillLevel(account.calculatedTotalBalanceInSats, totalBalance)}
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
