import React from 'react'
import * as rb from 'react-bootstrap'
import './wallet.css'
const Wallet = ({name,onUnlock,onLock,onDisplay}) => {
    return (
        <div>
            <br></br>
            <rb.Card style={{ width: '18rem' }} className = "wallet_cards">
              <rb.Card.Body>
                <rb.Card.Title>{name}</rb.Card.Title>
                <rb.Button className="btn btn-primary" onClick={()=>onUnlock(name)}>Unlock</rb.Button>{' '}
                <rb.Button href="/display">Open</rb.Button>{' '}
                <rb.Button onClick = {()=>onLock(name)}>Lock</rb.Button>
              </rb.Card.Body>
            </rb.Card>
        </div>
    )
}

export default Wallet
