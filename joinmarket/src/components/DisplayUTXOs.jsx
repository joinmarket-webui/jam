import React from 'react'

const DisplayUTXOs = ({ utxoID, utxo }) => (
  <div>
    <p></p>
    <p></p>
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

export default DisplayUTXOs
