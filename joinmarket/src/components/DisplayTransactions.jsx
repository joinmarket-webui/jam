import React from 'react'

const DisplayTransactions = ({transactionID,transaction}) => {
    return (
        <div>
            <p></p>
            
            <p></p>
            {/* <span>Transaction ID:  {transactionID}</span> */}
            <br></br>
            <span>Address: {transaction.address}</span>
            <br></br>
            <span>Value(Sats):  {transaction.value}</span>
            <br></br>
            <span>Confirmations: {transaction.confirmations}</span>
            <br></br>
            <span>MIxdepth: {transaction.mixdepth}</span>
            <p></p>
        </div>
    )
}

export default DisplayTransactions

