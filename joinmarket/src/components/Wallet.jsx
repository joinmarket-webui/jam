import React from 'react'
import { Button } from './Button'
import {Link} from 'react-router-dom'
import * as rb from 'react-bootstrap'
import './Wallet.css'
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
            {/* <h3>{name}</h3>
            <Button onClick={()=>onUnlock(name)}>Unlock</Button>
            <Button onClick = {()=>onDisplay(name)}>Display</Button>
            <Link to="/display" className="btn btn-primary">Open</Link>
            <Button onClick = {()=>onLock(name)}>Lock</Button> */}
        </div>
    )
}

export default Wallet
