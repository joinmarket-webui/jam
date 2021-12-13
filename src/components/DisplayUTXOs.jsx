import React from 'react'
import * as rb from 'react-bootstrap'

const byMixdepth = utxos => {
  const ret = utxos.reduce((res, utxo) => {
    const { mixdepth } = utxo
    res[mixdepth] = res[mixdepth] || []
    res[mixdepth].push(utxo)
    return res
  }, {})
  return ret
}


const DisplayUTXOs = ({ utxos }) => (
  <rb.Accordion>
    {Object.entries(byMixdepth(utxos)).map(([mixdepth, utxos]) => (
      <rb.Accordion.Item key={mixdepth} eventKey={mixdepth}>
        <rb.Accordion.Header className="head">
          <h5 className="mb-0">Account {mixdepth}</h5>
        </rb.Accordion.Header>
        <rb.Accordion.Body>
          <rb.ListGroup variant="flush">
            {utxos.map(utxo => (
              <rb.ListGroup.Item key={utxo.utxo}>
                <p>
                  Address: {utxo.address}
                  {' '}
                  {utxo.frozen && <span className="badge bg-info">frozen</span>}
                </p>
                {utxo.label && <p>Label: {utxo.label}</p>}
                <p>Sats: {utxo.value}</p>
                <p className="mb-0">{utxo.confirmations} Confirmations</p>
              </rb.ListGroup.Item>
            ))}
          </rb.ListGroup>
        </rb.Accordion.Body>
      </rb.Accordion.Item>
    ))}
  </rb.Accordion>
)

export default DisplayUTXOs
