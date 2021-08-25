import React from 'react'
import { useState, useEffect } from 'react'
import { BitcoinQR } from '@ibunker/bitcoin-react';
import '@ibunker/bitcoin-react/dist/index.css';
import { useLocation } from "react-router-dom"

const Receive = ({onReceive}) => {
    const location = useLocation()
    const [new_address, setNewAddress] = useState('')

    const getAddress = async(mixdepth)=>{
        //update request with token if backend updated
        const res = await fetch(`address/new/${mixdepth}`);
        const data = await res.json();
        console.log(data)
        return (data[0].address);
  
    }

    useEffect(()=>{

        const getNewAddress = async(account) => {
            const temp1 = parseInt(account,10)
            const temp = await getAddress(temp1)
            //window.alert(temp1)
            setNewAddress(temp)
            return
        }
    
        getNewAddress(location.state.account_no);
      },[])

    //getNewAddress('0')
    //const [address, setAddress] = useState('')
    const [temp_address, setTempAddress] = useState('')
    const [amount, setAmount] = useState('')

    const onSubmit = (e) => {
        e.preventDefault()
        
        if (!new_address) {
          alert('Please add the address')
          return
        }

        setTempAddress(new_address)
        //maybe add await here
        // let wallet =JSON.parse(localStorage.getItem('auth')).name;
        // onRecieve(wallet,mixdepth,amount,message)
    
        

      }

    return (
        <div>
        <h3>Receive funds</h3>
    <form method="POST" onSubmit={onSubmit}>
        <label>
        Address
        <input type="text" name="address"  value = {new_address } style = {{width: "415px"}} readOnly = {true} onChange={(e) => setNewAddress(e.target.value)}/>
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

export default Receive
