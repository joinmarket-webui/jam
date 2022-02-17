import React from 'react'
import * as rb from 'react-bootstrap'
import { displayDate } from '../utils'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'

const Utxo = ({ utxo, ...props }) => {
  const settings = useSettings()

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Row className="w-100">
          <rb.Col>
            <code className="text-break">{utxo.address}</code>
          </rb.Col>
          <rb.Col className="d-flex align-items-center justify-content-end pe-5">
            <Balance value={utxo.value} unit={settings.unit} showBalance={settings.showBalance} />
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
      </rb.Card.Body>
    </rb.Card>
  )
}

export default function DisplayUTXOs({ utxos, ...props }) {
  const settings = useSettings()

  return (
    <rb.ListGroup variant="flush" {...props}>
      {utxos.map((utxo, index) => (
        <Utxo
          key={utxo.utxo}
          utxo={utxo}
          className={`bg-transparent rounded-0 border-start-0 border-end-0 border-bottom-0 ${
            index === 0 ? 'border-top-0' : 'border-top-1'
          }`}
        />
      ))}
    </rb.ListGroup>
  )
}
