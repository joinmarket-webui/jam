import React from 'react'
import * as rb from 'react-bootstrap'
import DisplayUTXOs from './DisplayUTXOs'
import { useSettings } from '../context/SettingsContext'

const byAccount = (utxos) => {
  const ret = utxos.reduce((res, utxo) => {
    const { mixdepth } = utxo
    res[mixdepth] = res[mixdepth] || []
    res[mixdepth].push(utxo)
    return res
  }, {})
  return ret
}

export default function DisplayAccountUTXOs({ utxos, ...props }) {
  const settings = useSettings()

  return (
    <rb.Accordion {...props}>
      {Object.entries(byAccount(utxos)).map(([account, utxos]) => (
        <rb.Accordion.Item key={account} eventKey={account}>
          <rb.Accordion.Header className="head">
            <h5 className="mb-0">Privacy Level {account}</h5>
          </rb.Accordion.Header>
          <rb.Accordion.Body>
            <DisplayUTXOs utxos={utxos} unit={settings.unit} showBalances={settings.showBalance} />
          </rb.Accordion.Body>
        </rb.Accordion.Item>
      ))}
    </rb.Accordion>
  )
}
