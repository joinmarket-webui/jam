import React from 'react'
import { useState } from 'react'

const CreateWallet = ({onCreate}) => {

    const [wallet,setWallet] = useState('')
    const [password,setPassword]=useState('')

    const onSubmit = (e) => {
        e.preventDefault()
    
        if (!wallet || !password) {
          alert('Please add details')
          return;
        }
        console.log("okay")
        //maybe add await here
        // let wallet =JSON.parse(localStorage.getItem('auth')).name;
        // onPayment(wallet,mixdepth,amount,destination)
        onCreate(wallet,password)
        setWallet('')
        setPassword('')
        

      }
    return (
        <div>
            <h3>Create a wallet</h3>
            <form method="POST" onSubmit={onSubmit}>
        <label>
        Wallet Name
        <input type="text" name="wallet" value = {wallet} onChange={(e) => setWallet(e.target.value)}/>
        </label>
        <p></p>
        <label>
        Password
        <input type="password" name="password" value = {password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <p></p>
        
        <input type="submit" value="Submit" />

    </form>
        </div>
    )
}

export default CreateWallet
