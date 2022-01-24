import React from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { titleize } from '../utils'
import Balance from './Balance'

export default function DisplayAccounts({ accounts, unit, showBalances, ...props }) {
  return (
    <rb.Accordion {...props}>
      {Object.values(accounts).map(({ account, account_balance: balance, branches }) => (
        <rb.Accordion.Item key={account} eventKey={account}>
          <rb.Accordion.Header>
            <rb.Row className="w-100">
              <rb.Col>
                <h5 className="mb-0">Account {account}</h5>
              </rb.Col>
              <rb.Col className="d-flex align-items-center justify-content-end pe-5">
                 <Balance value={balance} unit={unit} showBalance={showBalances} />
              </rb.Col>
            </rb.Row>
          </rb.Accordion.Header>
          <rb.Accordion.Body className="pe-5">
            <Link to="/payment" state={{ account } } className="btn btn-outline-dark">Send</Link>{' '}
            <Link to="/receive" state={{ account }} className="btn btn-outline-dark">Receive</Link>
            {branches.map(({ balance, branch, entries }) => {
              const [type, derivation, xpub] = branch.split('\t')
              return (
                <article key={derivation}>
                  <rb.Row className="w-100 mt-4">
                    <rb.Col>
                      <h6>{titleize(type)}</h6>
                    </rb.Col>
                    <rb.Col className="d-flex align-items-center justify-content-end">
                      <Balance value={balance} unit={unit} showBalance={showBalances} />
                    </rb.Col>
                  </rb.Row>
                  <rb.Row className="w-100">
                    <rb.Col xs="auto">
                      <code className="text-break">{derivation}</code>
                    </rb.Col>
                    <rb.Col className="d-flex align-items-center">
                      <code className="text-break">{xpub}</code>
                    </rb.Col>
                  </rb.Row>
                  {entries.map(({ address, amount, hd_path: hdPath, labels }) => (
                    <rb.Row key={address} className="w-100 mt-3">
                      <rb.Col xs="auto">
                        <code className="text-break">{hdPath}</code>
                      </rb.Col>
                      <rb.Col>
                        <code className="text-break">{address}</code>
                        {' '}
                        {labels && <span className="badge bg-info">{labels}</span>}
                      </rb.Col>
                      <rb.Col className="d-flex align-items-center justify-content-end">
                        <Balance value={balance} unit={unit} showBalance={showBalances} />
                      </rb.Col>
                    </rb.Row>))}
                </article>
              )
            })}
          </rb.Accordion.Body>
        </rb.Accordion.Item>
      ))}
    </rb.Accordion>
  )
}
