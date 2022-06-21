import React, { useState, useRef, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import styles from './Jars.module.css'
import Sprite from './Sprite'
import Balance from './Balance'

const Jar = ({ accountIndex, balance, fill, onClick }) => {
  const settings = useSettings()
  const { t } = useTranslation()

  const [jarIsOpen, setJarIsOpen] = useState(false)
  const tooltipTarget = useRef(null)

  const jarIsEmpty = parseInt(balance, 10) === 0

  const jarSymbol = ((fill) => {
    switch (fill) {
      case 1:
        return jarIsOpen ? 'jar-open-fill-25' : 'jar-closed-fill-25'
      case 2:
        return jarIsOpen ? 'jar-open-fill-50' : 'jar-closed-fill-50'
      case 3:
        return jarIsOpen ? 'jar-open-fill-75' : 'jar-closed-fill-75'
      default:
        return jarIsOpen ? 'jar-open-empty' : 'jar-closed-empty'
    }
  })(fill)

  const onMouseOver = () => setJarIsOpen(true)
  const onMouseOut = () => setJarIsOpen(false)

  return (
    <div ref={tooltipTarget} className={styles['jar-container']} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
      <rb.Overlay
        target={tooltipTarget.current}
        show={jarIsOpen}
        placement="top"
        popperConfig={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 5],
              },
            },
          ],
        }}
      >
        {(props) => (
          <rb.Tooltip id="jar-tooltip" {...props}>
            {accountIndex === 0 && jarIsEmpty
              ? t('current_wallet.jar_tooltip_empty_jar_0')
              : t('current_wallet.jar_tooltip')}
          </rb.Tooltip>
        )}
      </rb.Overlay>
      <Sprite className={styles['jar-sprite']} symbol={jarSymbol} width="32px" height="48px" onClick={onClick} />
      <div className={styles['jar-index']}>{'#' + accountIndex}</div>
      <div className={styles['jar-balance']}>
        <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
      </div>
    </div>
  )
}

const Jars = ({ accountBalances, totalBalance, onClick }) => {
  const { t } = useTranslation()
  const sortedAccountBalances = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

  // Classifies the account balance into one of four groups:
  // - More than half of the total balance
  // - More than a quarter of the total balance
  // - Not empty
  // - Empty
  const calculateFillLevel = (accountBalance, totalBalance) => {
    if (accountBalance > totalBalance / 2) return 3
    if (accountBalance > totalBalance / 4) return 2
    if (accountBalance > 0) return 1

    return 0
  }

  const jarsDescriptionPopover = (
    <rb.Popover id="popover-basic">
      <rb.Popover.Body>{t('current_wallet.jars_title_popover')}</rb.Popover.Body>
    </rb.Popover>
  )

  return (
    <div className="d-flex flex-column align-items-center gap-5">
      <rb.OverlayTrigger placement="top" overlay={jarsDescriptionPopover}>
        <div className={styles['jars-title']}>
          <div>{t('current_wallet.jars_title')}</div>
          <Sprite className={styles['info-icon']} symbol="info" width="18" height="18" />
        </div>
      </rb.OverlayTrigger>
      <div className={styles['jars-container']}>
        {sortedAccountBalances.map((account) => {
          return (
            <Jar
              key={account.accountIndex}
              accountIndex={account.accountIndex}
              balance={account.totalBalance}
              fill={calculateFillLevel(account.totalBalance, totalBalance)}
              onClick={() => onClick(account.accountIndex)}
            />
          )
        })}
      </div>
    </div>
  )
}

export { Jars }
