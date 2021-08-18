import React from 'react'
import { useState } from 'react'
import { BitcoinQR } from '@ibunker/bitcoin-react';
import '@ibunker/bitcoin-react/dist/index.css';
const Recieve = ({onRecieve}) => {

    const [address, setAddress] = useState('')
    const [temp_address, setTempAddress] = useState('')
    const [amount, setAmount] = useState('')

    const onSubmit = (e) => {
        e.preventDefault()
        
        if (!address) {
          alert('Please add the address')
          return
        }

        setTempAddress(address)
        //maybe add await here
        // let wallet =JSON.parse(localStorage.getItem('auth')).name;
        // onRecieve(wallet,mixdepth,amount,message)
    
        

      }

    return (
        <div>
        <h3>Recieve funds</h3>
    <form method="POST" onSubmit={onSubmit}>
        <label>
        Address
        <input type="text" name="address"  value = {address }onChange={(e) => setAddress(e.target.value)}/>
        </label>
        <p></p>
        {/* <label>
        Mixdepth
        <input type="text" name="mixdepth" value = {address }onChange={(e) => setAddress(e.target.value)} />
        </label>
        <p></p> */}
        <label>
        Amount
        <input type="text" name="amount_sats" value = {amount} onChange={(e) => setAmount(e.target.value)}/>
        </label>
        <p></p>
        <input type="submit" value="Submit" />


    </form>

    {temp_address.length > 0? (
    <BitcoinQR
    bitcoinAddress={temp_address}
    message = ""
    amount ={amount}
    time = ""
    exp = ""
    />):("")}



        </div>
    )
}

export default Recieve
