import React, { useState } from 'react'
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
}

export default function DisplayAccountsOverlay({ accounts, show, onHide }: DisplayAccountsProps) {
  const { t } = useTranslation()
  const settings = useSettings()

  const [account, setAccount] = useState<Account | null>(accounts[0] || null)

  const nextAccount = () => {
    const currentIndex = account === null ? -1 : accounts.indexOf(account)
    setAccount(currentIndex + 1 >= accounts.length ? accounts[0] : accounts[currentIndex + 1])
  }
  const previousAccount = () => {
    const currentIndex = account === null ? -1 : accounts.indexOf(account)
    setAccount(currentIndex - 1 < 0 ? accounts[accounts.length - 1] : accounts[currentIndex - 1])
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
          <rb.Col className="d-flex justify-content-start">
            <div className="btn d-inline-flex align-items-center" onClick={() => onHide()}>
              <Sprite symbol="arrow-left" width="24" height="24" />
              <span className="mx-2">{t('global.back')}</span>
            </div>
          </rb.Col>
          <rb.Col className="d-flex justify-content-center">
            <rb.Offcanvas.Title className="d-inline-flex justify-content-center align-items-center">
              <div className="btn" onClick={() => previousAccount()}>
                <Sprite symbol="caret-left" width="24" height="24" />
              </div>
              <div className="mx-2">
                {t('current_wallet_advanced.account')} {account.account}
              </div>
              <div className="btn" onClick={() => nextAccount()}>
                <Sprite symbol="caret-right" width="24" height="24" />
              </div>
            </rb.Offcanvas.Title>
          </rb.Col>
          <rb.Col className="d-flex justify-content-end">
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
