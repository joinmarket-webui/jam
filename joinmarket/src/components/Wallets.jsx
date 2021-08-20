import React from 'react'
import Wallet from './Wallet'
import { BrowserRouter as Router, Link, Route ,Switch} from 'react-router-dom';
const Wallets = ({walletList,onUnlock,onLock,onDisplay}) => {
    
    return (
        <>
        <Link to="/payment">Make payment</Link>
        <p></p>
        <Link to="/create">Create Wallet</Link>
        <p></p>
        <Link to="/maker">Maker Service</Link>
        <p></p>
        <Link to="/receive">Recieve </Link>
        <p></p>
        {walletList.map((wallet,index)=>{
            return <Wallet key = {index} name={wallet} onUnlock = {onUnlock} onLock = {onLock} onDisplay = {onDisplay}></Wallet>
        })}
        </>
    )
}

export default Wallets
