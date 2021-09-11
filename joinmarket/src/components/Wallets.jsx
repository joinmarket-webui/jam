import React from 'react'
import Wallet from './Wallet'
const Wallets = ({walletList,onUnlock,onLock,onDisplay}) => {
    
    return (
        <>
        <p></p>
        {walletList.map((wallet,index)=>{
            return <Wallet key = {index} name={wallet} onUnlock = {onUnlock} onLock = {onLock} onDisplay = {onDisplay}></Wallet>
        })}
        </>
    )
}

export default Wallets
