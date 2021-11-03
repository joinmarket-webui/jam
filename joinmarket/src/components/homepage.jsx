import React from 'react'
import * as rb from 'react-bootstrap'
import './Homepage.css'
import { Link } from 'react-router-dom'

const Homepage = () => (
  <rb.Container className="container1">
    <rb.Row>
      <rb.Col className="column">
        <div className="text-center">
          <Link to="/create" className="btn btn-primary">Create Wallet</Link>
        </div>
      </rb.Col>
      <rb.Col className="column">
        <Link to="/showWallets" className="btn btn-primary">Show Wallets</Link>
      </rb.Col>
    </rb.Row>
  </rb.Container>
)

export default Homepage
