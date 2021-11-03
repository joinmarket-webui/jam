import React from 'react'
import './displayMixdepth.css'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'

const DisplayMixdepth = ({ walletInfo }) => {
  const accounts = []

  for (const account_info of walletInfo.accounts) {
    accounts.push(account_info)
  }

  return (
    <div>
      Total Balance: {walletInfo.total_balance} BTC
      <p></p>
      <rb.Button href="/maker">Maker Service</rb.Button>
      <p></p>
      {accounts.map((account, index) => (
        <div key={index}>
          <rb.Accordion>
            <rb.Accordion.Item eventKey={index}>
              <rb.Accordion.Header className="head">
                <div className="links">
                  <rb.Container>
                    <rb.Row>
                      <rb.Col>
                        Account {accounts[index].account}
                      </rb.Col>
                      <rb.Col>
                        Balance: {accounts[index].account_balance} BTC
                      </rb.Col>
                      <rb.Col>
                        <Link to={{ pathname: "/payment", state: { account_no: accounts[index].account } }} className="btn btn-primary">Send  </Link>{' '}
                      </rb.Col>
                      <rb.Col>
                        <Link to={{ pathname: "/receive", state: { account_no: accounts[index].account } }} className="btn btn-primary">Receive </Link>
                      </rb.Col>
                    </rb.Row>
                  </rb.Container>
                </div>
              </rb.Accordion.Header>
              <rb.Accordion.Body>
                <rb.Accordion>
                  <rb.Accordion.Item eventKey="0">
                    <rb.Accordion.Header>External Addresses Balance: {accounts[index].branches[0].balance} BTC </rb.Accordion.Header>
                    <div className="xpub">
                      Extended Pubkey : {accounts[index].branches[0].branch.split("\t").pop()}
                    </div>
                    <rb.Accordion.Body>
                      {accounts[index].branches[0].entries.map((user, i) => (
                        <div key={i}>
                          <rb.Accordion>
                            <rb.Accordion.Item eventKey="0">
                              <div className="address_label">
                                <b>{accounts[index].branches[0].entries[i].labels}</b>
                              </div>
                              <rb.Accordion.Header>{accounts[index].branches[0].entries[i].address} {'   '}  </rb.Accordion.Header>
                              <rb.Accordion.Body>
                                <div className="branch-body">
                                  amount: {accounts[index].branches[0].entries[i].amount}
                                </div>
                              </rb.Accordion.Body>
                            </rb.Accordion.Item>
                          </rb.Accordion>
                        </div>
                      ))}
                    </rb.Accordion.Body>
                  </rb.Accordion.Item>
                  <rb.Accordion.Item eventKey="1">
                    <rb.Accordion.Header>Internal Addresses Balance: {accounts[index].branches[1].balance} BTC</rb.Accordion.Header>
                    <rb.Accordion.Body>
                      {accounts[index].branches[1].entries.map((user, j) => (
                        <div key={j}>
                          <rb.Accordion>
                            <rb.Accordion.Item eventKey="0">
                              <rb.Accordion.Header>{accounts[index].branches[0].entries[j].address} {' '} {accounts[index].branches[0].entries[j].labels} </rb.Accordion.Header>
                              <rb.Accordion.Body>
                                <div className="branch_body">
                                  amount: {accounts[index].branches[0].entries[j].amount}
                                </div>
                              </rb.Accordion.Body>
                            </rb.Accordion.Item>
                          </rb.Accordion>
                        </div>
                      ))}
                    </rb.Accordion.Body>
                  </rb.Accordion.Item>
                </rb.Accordion>
              </rb.Accordion.Body>
            </rb.Accordion.Item>
          </rb.Accordion>
        </div>
      ))}
    </div>
  )
}

export default DisplayMixdepth
