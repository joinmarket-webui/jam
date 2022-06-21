import React, { useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import styles from './JarSelectorModal.module.css'
import Sprite from './Sprite'
import Balance from './Balance'

const Jar = ({ accountIndex, balance, isSelectable, isSelected, fill, onClick }) => {
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
    <div
      className={`${styles['jar-container']} ${!isSelectable && styles['not-selectable']}`}
      onClick={() => isSelectable && onClick()}
    >
      <Sprite className={styles['jar-sprite']} symbol={jarSymbol} width="32px" height="48px" />
      <div className={styles['jar-index']}>{'#' + accountIndex}</div>
      <div className={styles['jar-balance']}>
        <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
      </div>
      {isSelectable ? (
        <div className={`${styles['selection-circle']} ${isSelected && styles['selection-circle-filled']}`}></div>
      ) : (
        <div className={styles['selection-circle-placeholder']}></div>
      )}
    </div>
  )
}

export default function JarSelectorModal({
  isShown,
  title,
  accountBalances,
  totalBalance,
  disabledJar = undefined,
  onCancel,
  onConfirm,
}) {
  const [selectedJar, setSelectedJar] = useState(null)

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
    if (!totalBalance) return 0

    if (accountBalance > totalBalance / 2) return 3
    if (accountBalance > totalBalance / 4) return 2
    if (accountBalance > 0) return 1

    return 0
  }

  const cancel = () => {
    setSelectedJar(null)
    onCancel()
  }

  const confirm = () => {
    const jar = selectedJar
    setSelectedJar(null)
    onConfirm(jar)
  }

  return (
    <rb.Modal
      show={isShown}
      keyboard={true}
      onEscapeKeyDown={onCancel}
      centered={true}
      animation={true}
      backdrop="static"
      className={styles['modal']}
    >
      <rb.Modal.Header className={styles['modal-header']}>
        <rb.Modal.Title className={styles['modal-title']}>
          <div>
            <div>{title}</div>
            <rb.Button onClick={cancel} className={styles['cancel-button']}>
              <Sprite symbol="cancel" width="26" height="26" />
            </rb.Button>
          </div>
        </rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body className={styles['modal-body']}>
        <div className={styles['jars-container']}>
          {sortedAccountBalances.map((account) => {
            return (
              <Jar
                key={account.accountIndex}
                accountIndex={account.accountIndex}
                balance={account.totalBalance}
                isSelectable={account.accountIndex !== disabledJar}
                isSelected={account.accountIndex === selectedJar}
                fill={calculateFillLevel(account.totalBalance, totalBalance)}
                onClick={() => setSelectedJar(account.accountIndex)}
              />
            )
          })}
        </div>
      </rb.Modal.Body>
      <rb.Modal.Footer className={styles['modal-footer']}>
        <rb.Button variant="light" onClick={cancel} className="d-flex justify-content-center align-items-center">
          Cancel
        </rb.Button>
        <rb.Button variant="dark" onClick={confirm}>
          Confirm
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}
