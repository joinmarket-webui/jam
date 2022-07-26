import React, { useEffect, useMemo, useState, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { DisplayBranchHeader, DisplayBranchBody } from './DisplayBranch'
// @ts-ignore
import Balance from './Balance'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import styles from './DisplayAccountsOverlay.module.css'
import Sprite from './Sprite'
import { Account } from '../context/WalletContext'

interface DisplayAccountsProps extends rb.OffcanvasProps {
  accounts: Account[]
  selectedAccountIndex?: number
}

export function DisplayAccountsOverlay({ accounts, selectedAccountIndex = 0, show, onHide }: DisplayAccountsProps) {
  const { t } = useTranslation()
  const settings = useSettings()

  const [accountIndex, setAccountIndex] = useState<number>(selectedAccountIndex)
  const account = useMemo(() => accounts[accountIndex], [accounts, accountIndex])

  useEffect(() => {
    setAccountIndex(selectedAccountIndex)
  }, [selectedAccountIndex])

  const nextAccount = useCallback(
    () => setAccountIndex((current) => (current + 1 >= accounts.length ? 0 : current + 1)),
    [accounts]
  )
  const previousAccount = useCallback(
    () => setAccountIndex((current) => (current - 1 < 0 ? accounts.length - 1 : current - 1)),
    [accounts]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') previousAccount()
      else if (e.code === 'ArrowRight') nextAccount()
    },
    [previousAccount, nextAccount]
  )

  useEffect(() => {
    if (!show) return

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [show, onKeyDown])

  if (!account) {
    return <></>
  }

  return (
    <rb.Offcanvas className={styles['accounts-overlay']} show={show} onHide={onHide} placement="bottom" tabIndex={-1}>
      <rb.Offcanvas.Header className={styles['accounts-overlay-header']}>
        <div className="d-flex flex-1">
          <rb.Col>
            <rb.Button variant="link" className="unstyled ps-0" onClick={() => onHide()}>
              <span>{t('global.close')}</span>
            </rb.Button>
          </rb.Col>
          <rb.Col className="d-flex align-items-center justify-content-center">
            <rb.Offcanvas.Title className="d-inline-flex justify-content-center align-items-center">
              <rb.Button
                variant="link"
                className="unstyled d-inline-flex align-items-center"
                onClick={() => previousAccount()}
              >
                <Sprite symbol="caret-left" width="24" height="24" />
              </rb.Button>
              <div className={`${styles['accounts-overlay-header-title']}`}>
                {t('current_wallet_advanced.account')} <span className="ms-1">#{account.account}</span>
              </div>
              <rb.Button
                variant="link"
                className="unstyled d-inline-flex align-items-center"
                onClick={() => nextAccount()}
              >
                <Sprite symbol="caret-right" width="24" height="24" />
              </rb.Button>
            </rb.Offcanvas.Title>
          </rb.Col>
          <rb.Col className="d-none d-sm-flex align-items-center justify-content-end pe-0">
            <Balance
              valueString={account.account_balance}
              convertToUnit={settings.unit}
              showBalance={settings.showBalance}
            />
          </rb.Col>
        </div>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body className={styles['offcanvas-body']}>
        <rb.Accordion flush>
          {account.branches.map((branch, index) => (
            <rb.Accordion.Item className={styles['accordion-item']} key={branch.branch} eventKey={`${index}`}>
              <rb.Accordion.Header>
                <DisplayBranchHeader branch={branch} />
              </rb.Accordion.Header>
              <rb.Accordion.Body className={styles['accordion-body']}>
                <DisplayBranchBody branch={branch} />
              </rb.Accordion.Body>
            </rb.Accordion.Item>
          ))}
        </rb.Accordion>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
