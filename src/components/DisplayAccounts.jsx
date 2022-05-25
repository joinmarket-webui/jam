import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Balance from './Balance'
import DisplayBranch from './DisplayBranch'
import DisplayAccountsOverlay from './DisplayAccountsOverlay'
import { useSettings } from '../context/SettingsContext'
import { routes } from '../constants/routes'

export default function DisplayAccounts({ accounts, ...props }) {
  const { t } = useTranslation()
  const settings = useSettings()

  const [isOverlayShown, setIsOverlayShown] = useState(true)

  return (
    <>
      <rb.Accordion {...props}>
        {Object.values(accounts).map(({ account, account_balance, branches }) => {
          return (
            <rb.Accordion.Item key={account} eventKey={account}>
              <rb.Accordion.Header>
                <rb.Row className="w-100  me-1">
                  <rb.Col xs={'auto'}>
                    <h5 className="mb-0">
                      {t('current_wallet_advanced.account')} {account}
                    </h5>
                  </rb.Col>
                  <rb.Col className="d-flex align-items-center justify-content-end">
                    <Balance
                      valueString={account_balance}
                      convertToUnit={settings.unit}
                      showBalance={settings.showBalance}
                    />
                  </rb.Col>
                </rb.Row>
              </rb.Accordion.Header>
              <rb.Accordion.Body>
                <>
                  <Link to={routes.send} state={{ account }} className="btn btn-outline-dark">
                    {t('current_wallet_advanced.account_button_send')}
                  </Link>{' '}
                  <Link to={routes.receive} state={{ account }} className="btn btn-outline-dark">
                    {t('current_wallet_advanced.account_button_receive')}
                  </Link>
                  {branches.map((branch) => (
                    <DisplayBranch key={branch.branch} branch={branch} />
                  ))}
                </>
              </rb.Accordion.Body>
            </rb.Accordion.Item>
          )
        })}
      </rb.Accordion>

      <DisplayAccountsOverlay accounts={accounts} show={isOverlayShown} onHide={() => setIsOverlayShown(false)} />
    </>
  )
}
