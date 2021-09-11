import React from 'react'
import {useState,useEffect} from 'react'
import { Button } from './Button'
import DisplayMixdepth from './DisplayMixdepth'
import DisplayUTXOs from './DisplayUTXOs'

const DisplayWallet = ({listWalletInfo,onSend,listUTXOs}) => {
    const [wallet_info,setWalletInfo] = useState([])
    const [UTXOHistory,setUTXOHistory] = useState({})
    const [showUTXO,setShowUTXO] = useState(false);
    useEffect(()=>{
          const name = JSON.parse(sessionStorage.getItem('auth')).name;

          const getWalletInfo = async()=>{
          const wallet_info = await listWalletInfo(name);
          console.log(wallet_info);
          setWalletInfo(wallet_info);
        }

        const getUTXOs = async()=>{
            const utxos = await listUTXOs();
            setUTXOHistory(utxos)
            console.log(utxos)
        }
    
        getWalletInfo();
        getUTXOs();
      },[])
    
    return (
        <div>
            Wallet Details
            <p></p>
            {wallet_info.map((walletInfo,index)=>{
                return <DisplayMixdepth key={index} walletInfo = {walletInfo}></DisplayMixdepth>
            })}
            <p></p>
            <Button onClick={()=>{setShowUTXO(!showUTXO)}}>{showUTXO?"Hide UTXOs":"Show UTXOs"}</Button>
            <p></p>

            {
                showUTXO? 
                    Object.entries(UTXOHistory).map(([key, val])=>
                    <DisplayUTXOs key={key} utxoID={key} utxo={val}> </DisplayUTXOs>
                    )

                : ""
            }            
        </div>
    )
}

export default DisplayWallet
