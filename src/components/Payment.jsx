import React from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { getSession } from '../session'
import './Payment.css'

export default function Payment({ currentWallet, onPayment, onCoinjoin }) {
  const location = useLocation()
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [mixdepth, setMixdepth] = useState(location.state?.account_no)
  const [counterparties, setcounterparties] = useState('')
  const [isCoinjoin, setisCoinjoin] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()

    if (!amount || !mixdepth || !destination) {
      return alert('Please add details')
    }

    //maybe add await here
    if (!isCoinjoin) { //if normal payment
      onPayment(currentWallet, mixdepth, amount, destination)
    } else { //coinjoin
      if (!counterparties) {
        return alert('Please set counterparties to a non zero number')
      } else {
        onCoinjoin(mixdepth, amount, counterparties, destination)
        alert('Coinjoin in progress')
      }
    }

    setcounterparties('')
    setMixdepth('')
    setAmount('')
    setDestination('')
    setisCoinjoin(false)
  }

  return (

    <form onSubmit={onSubmit}>
      <h1>Send Payment</h1>
      <rb.Row>
        <rb.Col className="label">
          Receiver address:
        </rb.Col>
        <rb.Col>
          <input type="text" name="destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </rb.Col>
      </rb.Row>
      <rb.Row className="field">
        <rb.Col className="label">
          Account
        </rb.Col>
        <rb.Col>
          <input type="text" name="mixdepth" value={mixdepth} onChange={(e) => setMixdepth(e.target.value)} readOnly={true} />
        </rb.Col>
      </rb.Row>
      <rb.Row className="field">
        <rb.Col className="label">
          Amount(SATS)
        </rb.Col>
        <rb.Col>
          <input type="text" name="amount_sats" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </rb.Col>
      </rb.Row>

      <p></p>
      <br></br>
      <div className="coinjoin">
        Do you want to do a coinjoin?
        <p></p>
        Yes<input type="radio" name="coinjoin" onChange={(e) => setisCoinjoin(true)} />
        <p></p>
        No<input type="radio" name="coinjoin" onChange={(e) => setisCoinjoin(false)} />
        <p></p>
      </div>

      {isCoinjoin
        ? <div>
          <rb.Row className="field">
            <rb.Col className="label">
              Counterparties
            </rb.Col>
            <rb.Col>
              <input type="text" name="counterparties" value={counterparties} onChange={(e) => setcounterparties(e.target.value)} />
            </rb.Col>
          </rb.Row>
        </div>
        : null
      }

      <rb.Row className="btn-field">
        <button className="btncr" type="submit" value="Submit" ><span>Submit</span></button>
      </rb.Row>
    </form>
  )
}
