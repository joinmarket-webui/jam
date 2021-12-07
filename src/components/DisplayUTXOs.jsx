import React from 'react'
import * as rb from 'react-bootstrap'

const byMixdepth = utxos => {
  const ret = utxos.reduce((res, utxo) => {
    const { mixdepth } = utxo
    res[mixdepth] = res[mixdepth] || []
    res[mixdepth].push(utxo)
    return res
  }, {})
  console.log(ret)
  return ret
}


const DisplayUTXOs = ({ utxos }) => (
  <rb.Accordion>
    {Object.entries(byMixdepth(utxos)).map(([mixdepth, utxos]) => (
      <rb.Accordion.Item key={mixdepth} eventKey={mixdepth}>
        <rb.Accordion.Header className="head">
          Mixdepth {mixdepth}
        </rb.Accordion.Header>
        <rb.Accordion.Body>
          <ul className="list-group list-group-flush">
            {utxos.map(utxo => (
              <li className="list-group-item">
                <span>Address: {utxo.address}</span>
                <br></br>
                <span>Sats:  {utxo.value}</span>
                <br></br>
                <span>{utxo.confirmations} Confirmations</span>
                <pre>{JSON.stringify(utxo, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </rb.Accordion.Body>
      </rb.Accordion.Item>
    ))}
  </rb.Accordion>
)

export default DisplayUTXOs
