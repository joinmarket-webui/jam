import React from 'react'
import { useState, useEffect } from 'react'
import { BitcoinQR } from '@ibunker/bitcoin-react'
import '@ibunker/bitcoin-react/dist/index.css'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { getSession } from '../session'
import './Receive.css'

const Receive = ({ currentWallet, onReceive }) => {
  const location = useLocation()
  const [new_address, setNewAddress] = useState('')

  const getAddress = async (mixdepth) => {
    const { wallet, token } = getSession()
    const res = await fetch(`/api/v1/wallet/${wallet}/address/new/${mixdepth}`, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })
    const { address } = await res.json()
    return address
  }

  useEffect(() => {
    const getNewAddress = async (account) => {
      const temp1 = parseInt(account, 10)
      const temp = await getAddress(temp1)
      setNewAddress(temp)
      return
    }

    getNewAddress(location.state.account_no)
  }, [location.state.account_no])

  const [temp_address, setTempAddress] = useState('')
  const [amount, setAmount] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()

    if (!new_address) {
      return alert('Please add the address')
    }

    setTempAddress(new_address)
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Receive Funds</h1>
      <rb.Row>
        <rb.Col className="label">
          Address
        </rb.Col>
        <rb.Col>
          <input type="text" name="address" value={new_address} style={{ width: "415px" }} readOnly={true} onChange={(e) => setNewAddress(e.target.value)} />
        </rb.Col>
      </rb.Row>
      <rb.Row className="field">
        <rb.Col className="label">
          Amount(BTC)
        </rb.Col>
        <rb.Col>
          <input type="text" name="amount_sats" value={amount} style={{ width: "415px" }} onChange={(e) => setAmount(e.target.value)} />
        </rb.Col>
      </rb.Row>
      <rb.Row className="btn-field">
        <button className="btncr" type="submit" value="Submit" ><span>Get QR Code</span></button>
      </rb.Row>
      {temp_address.length > 0
        ? <BitcoinQR
          bitcoinAddress={temp_address}
          message=""
          amount={amount}
          time=""
          exp=""
        />
        : null
      }
    </form>
  )
}

export default Receive
