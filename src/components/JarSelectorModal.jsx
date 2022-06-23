import React, { useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import styles from './JarSelectorModal.module.css'
import Sprite from './Sprite'
import { calculateFillLevel, SelectableJar } from './jars/Jar'

export default function JarSelectorModal({
  isShown,
  title,
  accountBalances,
  totalBalance,
  disabledJar = undefined,
  onCancel,
  onConfirm,
}) {
  const { t } = useTranslation()

  const [selectedJar, setSelectedJar] = useState(null)

  const sortedAccountBalances = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

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
      onHide={onCancel}
      centered={true}
      animation={true}
      className={styles.modal}
    >
      <rb.Modal.Header className={styles.modalHeader}>
        <rb.Modal.Title className={styles.modalTitle}>
          <div>
            <div>{title}</div>
            <rb.Button onClick={cancel} className={styles.cancelButton}>
              <Sprite symbol="cancel" width="26" height="26" />
            </rb.Button>
          </div>
        </rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body className={styles.modalBody}>
        <div className={styles.jarsContainer}>
          {sortedAccountBalances.map((account) => {
            return (
              <SelectableJar
                key={account.accountIndex}
                index={account.accountIndex}
                balance={account.totalBalance}
                isSelectable={account.accountIndex !== disabledJar}
                isSelected={account.accountIndex === selectedJar}
                fillLevel={calculateFillLevel(account.totalBalance, totalBalance)}
                onClick={() => setSelectedJar(account.accountIndex)}
              />
            )
          })}
        </div>
      </rb.Modal.Body>
      <rb.Modal.Footer className={styles.modalFooter}>
        <rb.Button variant="light" onClick={cancel} className="d-flex justify-content-center align-items-center">
          {t('modal.confirm_button_reject')}
        </rb.Button>
        <rb.Button disabled={selectedJar === null} variant="dark" onClick={confirm}>
          {t('modal.confirm_button_accept')}
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}
