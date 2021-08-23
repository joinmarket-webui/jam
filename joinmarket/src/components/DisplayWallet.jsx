import React from 'react'
import {useState,useEffect} from 'react'
import DisplayMixdepth from './DisplayMixdepth'
const DisplayWallet = ({listWalletInfo,onSend,listTransactions}) => {
    const [wallet_info,setWalletInfo] = useState([])
    const [transactionHistory,setTransactionHistory] = useState([])
    useEffect(()=>{
          const name = JSON.parse(localStorage.getItem('auth')).name;

          const getWalletInfo = async()=>{
          const wallet_info = await listWalletInfo(name);
          console.log(wallet_info);
          setWalletInfo(wallet_info);
        }

        const getTransactions = async()=>{
            const transactions = await listTransactions();
            setTransactionHistory(transactions)
            console.log(transactions)
        }
    
        getWalletInfo();
        getTransactions();
      },[])
    
    return (
        <div>
            Wallet Details
            <p></p>
            {wallet_info.map((walletInfo,index)=>{
                return <DisplayMixdepth key={index} walletInfo = {walletInfo}></DisplayMixdepth>
            })}

            {transactionHistory.map((transaction,index)=>{
                return transaction.address;
            })}
            
            
        </div>
    )
}

export default DisplayWallet
