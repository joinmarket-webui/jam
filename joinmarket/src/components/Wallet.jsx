import React from 'react'
import { Button } from './Button'
import {Link} from 'react-router-dom'
const Wallet = ({name,onUnlock,onLock,onDisplay}) => {
    return (
        <div>
            <h3>{name}</h3>
            <Button onClick={()=>onUnlock(name)}>Unlock</Button>
            <Button onClick = {()=>onDisplay(name)}>Display</Button>
            {/* <Link to="/display" className="btn btn-primary">Open</Link> */}
            <Button onClick = {()=>onLock(name)}>Lock</Button>
        </div>
    )
}

export default Wallet
