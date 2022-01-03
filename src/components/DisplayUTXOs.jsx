import React from 'react'
import * as rb from 'react-bootstrap'
import { displayDate, valueToUnit } from '../utils'

export default function DisplayUTXOs({ utxos, unit, ...props}) {
  return (
    <rb.ListGroup variant="flush" {...props}>
      {utxos.map(utxo => (
        <rb.ListGroup.Item key={utxo.utxo} className="px-0">
          <rb.Row className="w-100">
            <rb.Col>
              {utxo.address}
            </rb.Col>
            <rb.Col className="d-flex align-items-center justify-content-end pe-5">
              {valueToUnit(utxo.value, unit)}
            </rb.Col>
          </rb.Row>
          <rb.Row className="w-100 mt-1">
            <rb.Col>
              {utxo.locktime && <span className="me-2">Locked until {displayDate(utxo.locktime)}</span>}
              {utxo.label && <span className="me-2 badge bg-light">{utxo.label}</span>}
              {utxo.frozen && <span className="badge bg-info">frozen</span>}
            </rb.Col>
            <rb.Col className="d-flex align-items-center justify-content-end pe-5">
              <small className="text-secondary">{utxo.confirmations} Confirmations</small>
            </rb.Col>
          </rb.Row>
        </rb.ListGroup.Item>
      ))}
    </rb.ListGroup>
  )
}
