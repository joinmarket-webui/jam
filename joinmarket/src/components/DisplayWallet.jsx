import React from 'react'
import {useState,useEffect} from 'react'
import { Button } from './Button'
import DisplayMixdepth from './DisplayMixdepth'
import DisplayUTXOs from './DisplayUTXOs'

const DisplayWallet = ({listWalletInfo,onSend,listUTXOs}) => {
    const [wallet_info,setWalletInfo] = useState([])
    const [UTXOHistory,setUTXOHistory] = useState({})
    const [showUTXO,setShowUTXO] = useState(false);
    // Websocket object with scope of DisplayWallet - we don't initialize
    // yet because it auto-opens, and we can only open once
    // we have authenticated:
    var ws;
    useEffect(()=>{
          const name = JSON.parse(sessionStorage.getItem('auth')).name;
          const token = JSON.parse(sessionStorage.getItem('auth')).token;
          ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);
            ws.onopen = (event) => {
              console.log("connected to websocket");
              ws.send(token);
            }
            ws.onmessage = (event) => {
              // For now we only have one message type,
              // namely the transaction notification:
              // For now, note that since the `getUtxos` function
              // is called on every render of the display page,
              // we don't need to somehow use this data other
              // than as some kind of popup/status bar notifier.
              // In future it might be possible to use the detailed
              // transaction deserialization passed in this notification,
              // for something.
              var wsdata = JSON.parse(event.data);
              alert("Websocket sent: " + wsdata.txid);
            }
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
