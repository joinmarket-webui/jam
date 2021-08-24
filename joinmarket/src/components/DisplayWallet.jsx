import React from 'react'
import {useState,useEffect} from 'react'
import { Button } from './Button'
import DisplayMixdepth from './DisplayMixdepth'
import DisplayTransactions from './DisplayTransactions'
const DisplayWallet = ({listWalletInfo,onSend,listTransactions}) => {
    const [wallet_info,setWalletInfo] = useState([])
    const [transactionHistory,setTransactionHistory] = useState({})
    const [showTransactions,setShowTransactions] = useState(false);
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
            <p></p>
            <Button onClick={()=>{setShowTransactions(!showTransactions)}}>{showTransactions?"Hide Transactions":"Show Transactions"}</Button>
            <p></p>

            {
                showTransactions? 
                
                    
                    Object.entries(transactionHistory).map(([key, val])=>
                    <DisplayTransactions key={key} transactionID={key} transaction={val}> </DisplayTransactions>
                    // <h5 key={key}> {key}:{val.address}</h5>
                )

                : ""
            }
            
           
            
        </div>
    )
}

export default DisplayWallet
