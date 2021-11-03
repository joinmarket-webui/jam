import React from 'react'
import Wallet from './Wallet'

const Wallets = ({ walletList, currentWallet, onUnlock, onLock, onDisplay }) =>
  walletList.map((wallet, index)=>
    <Wallet key={index} name={wallet} isCurrent={wallet === currentWallet} onUnlock={onUnlock} onLock={onLock} onDisplay={onDisplay} />
  )

export default Wallets
