import React from 'react'

const DisplayUTXOs = ({utxoID,utxo}) => {
    return (
        <div>
            <p></p>
            
            <p></p>
            {/* <span>Transaction ID:  {transactionID}</span> */}
            <br></br>
            <span>Address: {utxo.address}</span>
            <br></br>
            <span>Value(Sats):  {utxo.value}</span>
            <br></br>
            <span>Confirmations: {utxo.confirmations}</span>
            <br></br>
            <span>Mixdepth: {utxo.mixdepth}</span>
            <p></p>
        </div>
    )
}

export default DisplayUTXOs;

