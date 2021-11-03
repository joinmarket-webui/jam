import React from 'react'
import * as rb from 'react-bootstrap'
import './wallet.css'

const Wallet = ({ name, isCurrent, onUnlock, onLock }) => (
  <rb.Card style={{ width: '18rem' }} className="wallet_cards mb-3">
    <rb.Card.Body>
      <rb.Card.Title>{name}</rb.Card.Title>
      { isCurrent
        ? <>
          <rb.Button className="btn btn-primary me-2" href="/display">Open</rb.Button>
          <rb.Button className="btn btn-secondary" onClick={() => onLock(name)}>Lock</rb.Button>
          </>
        : <rb.Button className="btn btn-primary" onClick={() => onUnlock(name)}>Unlock</rb.Button>
      }
    </rb.Card.Body>
  </rb.Card>
)

export default Wallet
