import React from 'react'
import { useState, useEffect } from 'react'
import { BitcoinQR } from '@ibunker/bitcoin-react';
import '@ibunker/bitcoin-react/dist/index.css';
import { useLocation } from "react-router-dom";
import * as rb from 'react-bootstrap'
import './receive.css'

const Receive = ({onReceive}) => {
    const location = useLocation()
    const [new_address, setNewAddress] = useState('')

    const getAddress = async(mixdepth)=>{
        //update request with token if backend updated
        let authData = JSON.parse(sessionStorage.getItem('auth'));
        let token = "Bearer "+authData.token
        const res = await fetch(`address/new/${mixdepth}`,{
            method:'GET',
            headers: {
              'Content-type': 'application/json',
               'Authorization':token
            },
        });
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
        // let wallet =JSON.parse(sessionStorage.getItem('auth')).name;
        // onRecieve(wallet,mixdepth,amount,message)
    
        

      }

    return (
        <div>

<br></br>
            <div className = "heading">
            Recieve Funds
            </div>

            <form method="POST" onSubmit={onSubmit}>
            <rb.Container className = "center">
            <rb.Container fluid = "false" className = "form1">
                <rb.Row>
                    
                    <rb.Col className="label">
                        Address
                    </rb.Col>
                    <rb.Col>
                    <input type="text" name="address"  value = {new_address } style = {{width: "415px"}} readOnly = {true} onChange={(e) => setNewAddress(e.target.value)}/>
                    </rb.Col>
                    
                </rb.Row>
                <rb.Row className = "field">
                    
                    <rb.Col className="label">
                    Amount(BTC)
                    </rb.Col>
                    <rb.Col>
                    <input type="text" name="amount_sats" value = {amount} style = {{width: "415px"}} onChange={(e) => setAmount(e.target.value)}/>
                    </rb.Col>
                    
                </rb.Row>
                <rb.Row className = "btn-field">
                <button className="btncr" type="submit" value="Submit" ><span>Get QR Code</span></button>
                </rb.Row>

                {temp_address.length > 0? (
    <BitcoinQR
    bitcoinAddress={temp_address}
    message = ""
    amount ={amount}
    time = ""
    exp = ""
    />):("")}

            </rb.Container>
            </rb.Container>


            </form>

            

        {/* <h3>Receive funds</h3>
    <form method="POST" onSubmit={onSubmit}>
        <label>
        Address
        <input type="text" name="address"  value = {new_address } style = {{width: "415px"}} readOnly = {true} onChange={(e) => setNewAddress(e.target.value)}/>
        </label>
        <p></p> */}
        {/* <label>
        Mixdepth
        <input type="text" name="mixdepth" value = {address }onChange={(e) => setAddress(e.target.value)} />
        </label>
        <p></p> 
        {/* <label>
        Amount
        <input type="text" name="amount_sats" value = {amount} onChange={(e) => setAmount(e.target.value)}/>
        </label>
        <p></p>
        <input type="submit" value="Submit" />


    </form> */}

    



        </div>
    )
}

export default Receive
