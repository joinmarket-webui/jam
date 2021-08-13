import React from 'react'
import { useState } from 'react'
const Maker = ({onStart,onStop}) => {
    
      

    const [txFee,setTxFee] = useState('')
    const [cjfeeAbs,setCjfeeabs] = useState('')
    const [cjfeeRel,setCjfeerel] = useState('')
    const [orderType,setOrdertype] = useState('')
    const [minsize,setMinsize] = useState('')

    const[makerStarted,setMakerStarted] = useState()

    const [submitVal,setSubmitVal] = useState('Start Maker Service')

    

    const onSubmit = (e) => {
        e.preventDefault()

        

        if(localStorage.getItem('makerStarted')===null || localStorage.getItem('makerStarted')==='false'){
            console.log('b')
            if (!cjfeeRel) {
                alert('Please add details')
                return;
            }
            onStart(0,0,cjfeeRel,'relorder',1000);
            setCjfeerel('')
            localStorage.setItem('makerStarted',true) 
            setSubmitVal('Stop Maker Service')

        }
        else{
            console.log('c')
            onStop();
            localStorage.setItem('makerStarted',false) 
            setSubmitVal('Start Maker Service')

        }

        
        
    }
    return (
        <div>
            <h3>Maker Service</h3>
        <form method="POST" onSubmit={onSubmit}>
        
        
        <p></p>
        {
        localStorage.getItem('makerStarted')==='false' || localStorage.getItem('makerStarted')===null?
        <label>
        Relative Coinjoin Fee
        <input type="text" name="cjfee_r" value = {cjfeeRel} onChange={(e) => setCjfeerel(e.target.value)}/>
        </label>
        :''
        }
        
        <p></p>
        
        <input type="submit" value={localStorage.getItem('makerStarted')==='true'?'Stop Maker Service':'Start Maker Service'} />

    </form>
        </div>
    )
}

export default Maker
