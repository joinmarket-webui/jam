import React from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { titleize } from '../utils'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'

const BranchEntry = ({ entry, ...props }) => {
  const settings = useSettings()

  const { address, amount, hd_path: hdPath, labels, status } = entry

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Row key={address}>
          <rb.Col xs={'auto'}>
            <code className="text-break">{hdPath}</code>
          </rb.Col>
          <rb.Col lg={{ order: 'last' }} className="d-flex align-items-center justify-content-end">
            <Balance valueString={amount} convertToUnit={settings.unit} showBalance={settings.showBalance} />
          </rb.Col>
          <rb.Col xs={'auto'}>
            <code className="text-break">{address}</code> {labels && <span className="badge bg-info">{labels}</span>}
            {status && <span className="badge bg-info">{status}</span>}
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}

export default function DisplayAccounts({ accounts, ...props }) {
  const settings = useSettings()

  return (
    <rb.Accordion {...props}>
      {Object.values(accounts).map(({ account, account_balance: balance, branches }) => (
        <rb.Accordion.Item key={account} eventKey={account}>
          <rb.Accordion.Header>
            <rb.Row className="w-100  me-1">
              <rb.Col xs={'auto'}>
                <h5 className="mb-0">
                  {settings.useAdvancedWalletMode ? 'Account' : 'Privacy Level'} {account}
                </h5>
              </rb.Col>
              <rb.Col className="d-flex align-items-center justify-content-end">
                <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
              </rb.Col>
            </rb.Row>
          </rb.Accordion.Header>
          <rb.Accordion.Body>
            <Link to="/send" state={{ account }} className="btn btn-outline-dark">
              Send
            </Link>{' '}
            <Link to="/receive" state={{ account }} className="btn btn-outline-dark">
              Receive
            </Link>
            {branches.map(({ balance, branch, entries }) => {
              const [type, derivation, xpub] = branch.split('\t')
              return (
                <article key={derivation}>
                  <rb.Row className="mt-4 pe-3">
                    <rb.Col>
                      <h6>{titleize(type)}</h6>
                    </rb.Col>
                    <rb.Col className="d-flex align-items-center justify-content-end">
                      <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
                    </rb.Col>
                  </rb.Row>
                  <rb.Row className="p-3">
                    <rb.Col xs="auto">
                      <code className="text-break">{derivation}</code>
                    </rb.Col>
                    <rb.Col xs="auto">
                      <code className="text-break">{xpub}</code>
                    </rb.Col>
                  </rb.Row>
                  {entries.map((entry, index) => (
                    <BranchEntry
                      key={entry.address}
                      entry={entry}
                      className={`bg-transparent rounded-0 border-start-0 border-end-0 ${
                        index === 0 ? 'border-top-1 mt-2' : 'border-top-0'
                      }`}
                    />
                  ))}
                </article>
              )
            })}
          </rb.Accordion.Body>
        </rb.Accordion.Item>
      ))}
    </rb.Accordion>
  )
}
