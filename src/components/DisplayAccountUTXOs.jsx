import React from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import DisplayUTXOs from './DisplayUTXOs'

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
  const { t } = useTranslation()

  return (
    <rb.Accordion {...props}>
      {Object.entries(byAccount(utxos)).map(([account, utxos]) => (
        <rb.Accordion.Item key={account} eventKey={account}>
          <rb.Accordion.Header className="head">
            <h5 className="mb-0">
              {t('current_wallet_advanced.acount')} {account}
            </h5>
          </rb.Accordion.Header>
          <rb.Accordion.Body>
            <DisplayUTXOs utxos={utxos} />
          </rb.Accordion.Body>
        </rb.Accordion.Item>
      ))}
    </rb.Accordion>
  )
}
