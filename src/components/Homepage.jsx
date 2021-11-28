import React from 'react'
import * as rb from 'react-bootstrap'
import { Link } from 'react-router-dom'

const Homepage = () => (
  <rb.Container>
    <rb.Row>
      <rb.Col>
        <rb.ListGroup>
          <rb.ListGroup.Item action to="/wallets" target="_blank">Show Wallets</rb.ListGroup.Item>
          <rb.ListGroup.Item action to="/create-wallet">Create Wallet</rb.ListGroup.Item>
        </rb.ListGroup>
      </rb.Col>
    </rb.Row>
  </rb.Container>
)

export default Homepage
