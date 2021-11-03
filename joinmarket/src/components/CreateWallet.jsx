import React from 'react'
import { useState } from 'react'
import './createWallet.css'
import * as rb from 'react-bootstrap'

const CreateWallet = ({ onCreate }) => {
  const [wallet, setWallet] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()

    if (!wallet || !password) {
      alert('Please add details')
      return;
    }

    onCreate(wallet, password)
    setWallet('')
    setPassword('')
  }

  return (
    <div>
      <div className="heading">
        Create Wallet
      </div>

      <form method="POST" onSubmit={onSubmit}>
        <rb.Container className="center">
          <rb.Container fluid="false" className="form1">
            <rb.Row>

              <rb.Col className="label">
                Wallet Name
              </rb.Col>
              <rb.Col>
                <input style={{ width: "220px" }} classname="field-border" type="text" name="wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} />
              </rb.Col>

            </rb.Row>
            <rb.Row className="field">

              <rb.Col className="label">
                Password
              </rb.Col>
              <rb.Col>
                <input type="password" style={{ width: "220px" }} name="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </rb.Col>

            </rb.Row>
            <rb.Row className="btn-field">
              <button className="btncr" type="submit" value="Submit"><span>Submit</span></button>
            </rb.Row>
          </rb.Container>
        </rb.Container>
      </form>
    </div>
  )
}

export default CreateWallet
