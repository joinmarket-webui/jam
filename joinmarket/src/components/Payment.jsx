import React from 'react'
import { useState } from 'react'
import { useLocation } from "react-router-dom"
const Payment = ({onPayment}) => {
    const location = useLocation()
    const [destination, setDestination] = useState('')
    const [amount, setAmount] = useState('')
    const [mixdepth, setMixdepth] = useState(location.state.account_no)

    const onSubmit = (e) => {
        e.preventDefault()
    
        if (!amount || !mixdepth || !destination) {
          alert('Please add details')
          return
        }
        //maybe add await here
        let wallet =JSON.parse(localStorage.getItem('auth')).name;
        onPayment(wallet,mixdepth,amount,destination)
    
        

      }

    return (
        <div>
        <h3>Make Payment</h3>
    <form method="POST" onSubmit={onSubmit}>
        <label>
        Receiver address:
        <input type="text" name="destination"  value = {destination }onChange={(e) => setDestination(e.target.value)}/>
        </label>
        <p></p>
        <label>
        Account
        <input type="text" name="mixdepth" value = {mixdepth} onChange={(e) => setMixdepth(e.target.value)} />
        </label>
        <p></p>
        <label>
        Amount
        <input type="text" name="amount_sats" value = {amount} onChange={(e) => setAmount(e.target.value)}/>
        </label>
        <p></p>
        <input type="submit" value="Submit" />

    </form>
        </div>
    )
}

export default Payment
