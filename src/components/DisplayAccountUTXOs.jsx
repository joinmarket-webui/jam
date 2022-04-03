import React from 'react'
import { useTranslation } from 'react-i18next'
import DisplayUTXOs from './DisplayUTXOs'
import Accordion from 'react-bootstrap/Accordion'

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
    <Accordion {...props}>
      {Object.entries(byAccount(utxos)).map(([account, utxos]) => (
        <Accordion.Item key={account} eventKey={account}>
          <Accordion.Header className="head">
            <h5 className="mb-0">
              {t('current_wallet_advanced.account')} {account}
            </h5>
          </Accordion.Header>
          <Accordion.Body>
            <DisplayUTXOs utxos={utxos} />
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
