import React from 'react'
import { useHistory } from 'react-router-dom';
import { useState } from 'react'
import { useGlobal } from 'reactn';

const Maker = ({onStart,onStop}) => {

    const [cjfeeRel,setCjfeerel] = useState('')
    const [makerStarted]  = useGlobal("makerStarted");
    const [setSubmitVal] = useState('Start Maker Service')

    const history = useHistory();

    const onSubmit = (e) => {
        e.preventDefault()



        if(makerStarted === false){
            console.log('b')
            if (!cjfeeRel) {
                alert('Please add details')
                return;
            }
            onStart(0,0,cjfeeRel,'sw0reloffer',1000);
            setCjfeerel('')
            alert("Attempting to start the yield generator. Check the status bar for updates.");
            setSubmitVal('Stop Maker Service')

        }
        else{
            console.log('c')
            onStop();
            setSubmitVal('Start Maker Service')

        }
        let path = `/display`;
        history.push(path);


    }
    return (
        <div>
            <h3>Maker Service</h3>
        <form method="POST" onSubmit={onSubmit}>


        <p></p>
        {
        makerStarted === false ?
        <label>
        Relative Coinjoin Fee
        <input type="text" name="cjfee_r" value = {cjfeeRel} onChange={(e) => setCjfeerel(e.target.value)}/>
        </label>
        :''
        }

        <p></p>

        <input type="submit" value={makerStarted ==='true'?'Stop Maker Service':'Start Maker Service'} />

    </form>
        </div>
    )
}

export default Maker
