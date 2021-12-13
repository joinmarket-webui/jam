import React from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'

export default function DisplayAccounts({ accounts }) {
  return (
    <rb.Accordion>
      {accounts.map((account, index) => (
        <rb.Accordion.Item key={index} eventKey={index}>
          <rb.Accordion.Header>
            <h5 className="mb-0">Account {accounts[index].account}</h5>
            <div className="ms-auto">{accounts[index].account_balance} BTC</div>
          </rb.Accordion.Header>
          <rb.Accordion.Body>
            <Link to="/payment" state={{ account: accounts[index].account } } className="btn btn-primary">Send</Link>{' '}
            <Link to="/receive" state={{ account: accounts[index].account } } className="btn btn-primary">Receive</Link>
            <rb.Accordion className="mt-3">
              <rb.Accordion.Item eventKey="0">
                <rb.Accordion.Header>External Addresses Balance: {accounts[index].branches[0].balance} BTC</rb.Accordion.Header>
                <rb.Accordion.Body>
                  <code className="text-break">
                    {accounts[index].branches[0].branch.split("\t").pop()}
                  </code>
                  <rb.ListGroup variant="flush" className="mt-3">
                    {accounts[index].branches[0].entries.map((user, j) => (
                      <rb.ListGroup.Item key={j}>
                        <rb.Row>
                          <rb.Col>{accounts[index].branches[0].entries[j].address}</rb.Col>
                          <rb.Col>{accounts[index].branches[0].entries[j].amount} BTC</rb.Col>
                        </rb.Row>
                        {accounts[index].branches[0].entries[j].labels && (
                          <rb.Row>
                            <rb.Col>{accounts[index].branches[0].entries[j].labels}</rb.Col>
                          </rb.Row>
                        )}
                      </rb.ListGroup.Item>
                    ))}
                  </rb.ListGroup>
                </rb.Accordion.Body>
              </rb.Accordion.Item>
              <rb.Accordion.Item eventKey="1">
                <rb.Accordion.Header>Internal Addresses Balance: {accounts[index].branches[1].balance} BTC</rb.Accordion.Header>
                <rb.Accordion.Body>
                  {accounts[index].branches[1].entries.length > 0 ? (
                    <rb.ListGroup variant="flush">
                      {accounts[index].branches[1].entries.map((user, j) => (
                        <rb.ListGroup.Item key={j}>
                          <rb.Row>
                            <rb.Col>{accounts[index].branches[1].entries[j].address}</rb.Col>
                            <rb.Col>{accounts[index].branches[1].entries[j].amount} BTC</rb.Col>
                          </rb.Row>
                          {accounts[index].branches[1].entries[j].labels && (
                            <rb.Row>
                              <rb.Col>{accounts[index].branches[1].entries[j].labels}</rb.Col>
                            </rb.Row>
                          )}
                        </rb.ListGroup.Item>
                      ))}
                    </rb.ListGroup>
                  ) : 'No balance'}
                </rb.Accordion.Body>
              </rb.Accordion.Item>
            </rb.Accordion>
          </rb.Accordion.Body>
        </rb.Accordion.Item>
      ))}
    </rb.Accordion>
  )
}
