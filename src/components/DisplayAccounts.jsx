import React from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'

export default function DisplayAccounts({ accounts }) {
  return (
    <rb.Accordion>
      {accounts.map((account, index) => (
        <rb.Accordion.Item key={index} eventKey={index}>
          <rb.Accordion.Header>
            <rb.Row>
              <rb.Col>
                Account {accounts[index].account}
                <br />
                {accounts[index].account_balance} BTC
              </rb.Col>
              <rb.Col>
                <Link to={{ pathname: "/payment", state: { account_no: accounts[index].account } }} className="btn btn-primary">Send  </Link>{' '}
                <Link to={{ pathname: "/receive", state: { account_no: accounts[index].account } }} className="btn btn-primary">Receive </Link>
              </rb.Col>
            </rb.Row>
          </rb.Accordion.Header>
          <rb.Accordion.Body>
            <rb.Accordion>
              <rb.Accordion.Item eventKey="0">
                <rb.Accordion.Header>External Addresses Balance: {accounts[index].branches[0].balance} BTC </rb.Accordion.Header>
                <rb.Accordion.Body>
                  <p class="text-break">
                    Extended Pubkey : {accounts[index].branches[0].branch.split("\t").pop()}
                  </p>
                  {accounts[index].branches[0].entries.map((user, i) => (
                    <rb.Row key={i}>
                      <rb.Col>
                        {accounts[index].branches[0].entries[i].address}
                        {' '}
                        {accounts[index].branches[0].entries[i].labels}
                      </rb.Col>
                      <rb.Col>
                        {accounts[index].branches[0].entries[i].amount} BTC
                      </rb.Col>
                    </rb.Row>
                  ))}
                </rb.Accordion.Body>
              </rb.Accordion.Item>
              <rb.Accordion.Item eventKey="1">
                <rb.Accordion.Header>Internal Addresses Balance: {accounts[index].branches[1].balance} BTC</rb.Accordion.Header>
                <rb.Accordion.Body>
                  {accounts[index].branches[1].entries.map((user, j) => (
                    <rb.Row key={j}>
                      <rb.Col>
                        {accounts[index].branches[0].entries[j].address}
                        {' '}
                        {accounts[index].branches[0].entries[j].labels}
                      </rb.Col>
                      <rb.Col>
                        {accounts[index].branches[0].entries[j].amount} BTC
                      </rb.Col>
                    </rb.Row>
                  ))}
                </rb.Accordion.Body>
              </rb.Accordion.Item>
            </rb.Accordion>
          </rb.Accordion.Body>
        </rb.Accordion.Item>
      ))}
    </rb.Accordion>
  )
}
