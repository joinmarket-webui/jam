import React from 'react'
import { useSettings } from '../context/SettingsContext'
import styles from './Jars.module.css'
import Sprite from './Sprite'
import Balance from './Balance'

const Jar = ({ accountIndex, balance, fill }) => {
  const settings = useSettings()

  const jarSymbol = ((fill) => {
    switch (fill) {
      case 1:
        return 'jar-closed-fill-25'
      case 2:
        return 'jar-closed-fill-50'
      case 3:
        return 'jar-closed-fill-75'
      default:
        return 'jar-closed-empty'
    }
  })(fill)

  return (
    <div className="d-flex flex-column align-items-center gap-1">
      <Sprite symbol={jarSymbol} width="2rem" height="3rem" />
      <div className={styles['jar-index']}>{'#' + accountIndex}</div>
      <div className={styles['jar-balance']}>
        <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
      </div>
    </div>
  )
}

const Jars = ({ accountBalances, totalBalance }) => {
  const sortedAccountBalances = (accountBalances || []).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)

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

  return (
    <div className={styles['jars-container']}>
      {sortedAccountBalances.map((account) => {
        return (
          <Jar
            key={account.accountIndex}
            accountIndex={account.accountIndex}
            balance={account.totalBalance}
            fill={calculateFillLevel(account.totalBalance, totalBalance)}
          />
        )
      })}
    </div>
  )
}

export { Jars }
