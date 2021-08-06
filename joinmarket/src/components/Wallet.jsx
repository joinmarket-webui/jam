import React from 'react'
import { Button } from './Button'

const Wallet = ({name,onUnlock,onLock,onDisplay}) => {
    return (
        <div>
            <h3>{name}</h3>
            <Button onClick={()=>onUnlock(name)}>Unlock</Button>
            <Button onClick = {()=>onDisplay(name)}>Display</Button>
            <Button onClick = {()=>onLock(name)}>Lock</Button>
        </div>
    )
}

export default Wallet
