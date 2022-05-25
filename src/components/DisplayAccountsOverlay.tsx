import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import DisplayBranch from './DisplayBranch'
// @ts-ignore
import Balance from './Balance'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import styles from './DisplayAccountsOverlay.module.css'
import Sprite from './Sprite'
import { Account } from '../global/types'

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

  const nextAccount = () => {
    const currentIndex = account === null ? 0 : accounts.indexOf(account)
    setAccountIndex(currentIndex + 1 >= accounts.length ? 0 : currentIndex + 1)
  }
  const previousAccount = () => {
    const currentIndex = account === null ? 0 : accounts.indexOf(account)
    setAccountIndex(currentIndex - 1 < 0 ? accounts.length - 1 : currentIndex - 1)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') previousAccount()
    else if (e.code === 'ArrowRight') nextAccount()
  }

  if (!account) {
    return <></>
  }

  return (
    <rb.Offcanvas
      className={styles['accounts-overlay']}
      show={show}
      onHide={onHide}
      placement="bottom"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <rb.Offcanvas.Header className={styles['accounts-overlay-header']}>
        <rb.Row className="w-100">
          <rb.Col className="d-flex align-items-center justify-content-start">
            <rb.Button variant="link" className="unstyled d-inline-flex align-items-center" onClick={() => onHide()}>
              <Sprite symbol="arrow-left" width="24" height="24" />
              <span className="mx-2">{t('global.back')}</span>
            </rb.Button>
          </rb.Col>
          <rb.Col
            className="d-flex align-items-center justify-content-center"
            xs={{ order: 'last', span: 12 }}
            sm={{ order: 2, span: 'auto' }}
          >
            <rb.Offcanvas.Title className="d-inline-flex justify-content-center align-items-center">
              <rb.Button
                variant="link"
                className="unstyled d-inline-flex align-items-center"
                onClick={() => previousAccount()}
              >
                <Sprite symbol="caret-left" width="24" height="24" />
              </rb.Button>
              <div className={`${styles['accounts-overlay-header-title']}`}>
                {t('current_wallet_advanced.account')} <span className="ml-1">{account.account}</span>
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
          <rb.Col className="d-flex align-items-center justify-content-end" sm={{ order: 'last' }}>
            <Balance
              valueString={account.account_balance}
              convertToUnit={settings.unit}
              showBalance={settings.showBalance}
            />
          </rb.Col>
        </rb.Row>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        {account.branches.map((branch) => (
          <DisplayBranch key={branch.branch} branch={branch} />
        ))}
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
