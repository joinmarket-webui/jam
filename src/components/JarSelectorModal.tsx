import { useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { jarFillLevel, SelectableJar } from './jars/Jar'
import { AccountBalances } from '../context/BalanceSummary'
import { AmountSats } from '../libs/JmWalletApi'
import Sprite from './Sprite'
import styles from './JarSelectorModal.module.css'

interface JarSelectorModalProps {
  isShown: boolean
  title: string
  accountBalances: AccountBalances
  totalBalance: AmountSats
  disabledJar?: JarIndex
  onCancel: () => void
  onConfirm: (jarIndex: JarIndex) => Promise<void>
}

export default function JarSelectorModal({
  isShown,
  title,
  accountBalances,
  totalBalance,
  disabledJar,
  onCancel,
  onConfirm,
}: JarSelectorModalProps) {
  const { t } = useTranslation()

  const [isConfirming, setIsConfirming] = useState(false)
  const [selectedJar, setSelectedJar] = useState<JarIndex>()

  const sortedAccountBalances = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

  const cancel = () => {
    setSelectedJar(undefined)
    onCancel()
  }

  const confirm = () => {
    if (selectedJar === undefined) return

    setIsConfirming(true)
    onConfirm(selectedJar)
      .then(() => setSelectedJar(undefined))
      .finally(() => setIsConfirming(false))
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
      size="lg"
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
                balance={account.calculatedAvailableBalanceInSats}
                frozenBalance={account.calculatedFrozenOrLockedBalanceInSats}
                isSelectable={account.accountIndex !== disabledJar}
                isSelected={account.accountIndex === selectedJar}
                fillLevel={jarFillLevel(account.calculatedTotalBalanceInSats, totalBalance)}
                onClick={(jarIndex) => setSelectedJar(jarIndex)}
              />
            )
          })}
        </div>
      </rb.Modal.Body>
      <rb.Modal.Footer className={styles.modalFooter}>
        <rb.Button variant="light" onClick={cancel} className="d-flex flex-1 justify-content-center align-items-center">
          <Sprite symbol="cancel" width="26" height="26" />
          <div>{t('modal.confirm_button_reject')}</div>
        </rb.Button>
        <rb.Button
          disabled={isConfirming || selectedJar === undefined}
          variant="dark"
          onClick={confirm}
          className="d-flex flex-1 justify-content-center align-items-center"
        >
          {isConfirming ? (
            <>
              <rb.Spinner as="span" animation="border" size="sm" role="status" />
            </>
          ) : (
            <>{t('modal.confirm_button_accept')}</>
          )}
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}
