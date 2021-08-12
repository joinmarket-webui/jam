import React from 'react'
import { useState } from 'react'
const Maker = ({onStart}) => {
    
      

    const [txFee,setTxFee] = useState('')
    const [cjfeeAbs,setCjfeeabs] = useState('')
    const [cjfeeRel,setCjfeerel] = useState('')
    const [orderType,setOrdertype] = useState('')
    const [minsize,setMinsize] = useState('')

    const onSubmit = (e) => {
        e.preventDefault()
    
        if (!txFee || !cjfeeRel || !cjfeeAbs || !orderType || !minsize) {
          alert('Please add details')
          return;
        }
        onStart(txFee,cjfeeAbs,cjfeeRel,orderType,minsize);

        
        setOrdertype('')
        setTxFee('')
        setCjfeerel('')
        setCjfeeabs('')
        setMinsize('')
        
    }
    return (
        <div>
            <h3>Maker Service</h3>
        <form method="POST" onSubmit={onSubmit}>
        <label>
        Transaction Fee
        <input type="text" name="txfee"  value = {txFee}onChange={(e) => setTxFee(e.target.value)}/>
        </label>
        <p></p>
        <label>
        Absolute Coinjoin fee
        <input type="text" name="cjfee_a" value = {cjfeeAbs} onChange={(e) => setCjfeeabs(e.target.value)} />
        </label>
        <p></p>
        <label>
        Relative Coinjoin Fee
        <input type="text" name="cjfee_r" value = {cjfeeRel} onChange={(e) => setCjfeerel(e.target.value)}/>
        </label>
        <p></p>
        
        Order Type
        <p></p>
        Absolute Fee <input type = "radio" name="ordertype" value="absoffer" onChange={(e) => setOrdertype(e.target.value)}/>
        Relative Fee<input type = "radio" name="ordertype" value="reloffer" onChange={(e) => setOrdertype(e.target.value)}/>
       
       
        <p></p>
        <label>
        Minimum size
        <input type="text" name="minsize" value = {minsize} onChange={(e) => setMinsize(e.target.value)}/>
        </label>
        <p></p>
        <input type="submit" value="Start Maker Service" />

    </form>
        </div>
    )
}

export default Maker
