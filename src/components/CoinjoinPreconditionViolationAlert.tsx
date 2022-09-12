import React, { forwardRef } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import { CoinjoinRequirementSummary } from '../hooks/CoinjoinRequirements'
import { jarInitial } from './jars/Jar'
import { shortenStringMiddle } from '../utils'
import Sprite from './Sprite'
import Balance from './Balance'

interface CoinjoinPreconditionViolationAlertProps {
  summary: CoinjoinRequirementSummary
}

export const CoinjoinPreconditionViolationAlert = forwardRef(
  ({ summary }: CoinjoinPreconditionViolationAlertProps, ref: React.Ref<HTMLDivElement>) => {
    const { t } = useTranslation()
    const settings = useSettings()

    if (summary.isFulfilled) return <></>

    if (summary.numberOfMissingUtxos > 0) {
      return (
        <rb.Alert variant="warning" ref={ref}>
          {t('scheduler.precondition.hint_missing_utxos', {
            minConfirmations: summary.options.minConfirmations,
          })}
        </rb.Alert>
      )
    }

    if (summary.numberOfMissingConfirmations > 0) {
      return (
        <rb.Alert variant="warning" ref={ref}>
          {t('scheduler.precondition.hint_missing_confirmations', {
            minConfirmations: summary.options.minConfirmations,
            amountOfMissingConfirmations: summary.numberOfMissingConfirmations,
          })}
        </rb.Alert>
      )
    }

    const utxosViolatingRetriesLeft = summary.violations
      .map((it) => it.utxosViolatingRetriesLeft)
      .reduce((acc, utxos) => acc.concat(utxos), [])

    if (utxosViolatingRetriesLeft.length > 0) {
      return (
        <rb.Alert variant="danger" ref={ref}>
          <>
            <Trans i18nKey="scheduler.precondition.hint_missing_retries">
              You tried too many times. See
              <a
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.7/docs/SOURCING-COMMITMENTS.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                the docs
              </a>{' '}
              for more info.
            </Trans>
            <br />
            <br />
            <Trans
              i18nKey="scheduler.precondition.hint_missing_retries_detail"
              count={utxosViolatingRetriesLeft.length}
            >
              Following utxos have been used unsuccessfully too many times:
              <ul className="mt-2 ps-2">
                {utxosViolatingRetriesLeft.map((utxo, index) => (
                  <li key={index} className="mb-2 slashed-zeroes small" style={{ display: 'inline-flex' }}>
                    <span className="pe-1" style={{ display: 'inline-flex' }}>
                      <Sprite symbol="jar-closed-fill-50" width="20" height="20" />
                      <span className="slashed-zeroes">
                        <strong>{jarInitial(utxo.mixdepth)}</strong>
                      </span>
                      :
                    </span>
                    <div>
                      <span>{utxo.address}</span>
                      &nbsp;(
                      <Balance
                        valueString={`${utxo.value}`}
                        convertToUnit={settings.unit}
                        showBalance={settings.showBalance}
                      />
                      )
                      <br />
                      <small>{shortenStringMiddle(utxo.utxo, 32)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </Trans>
          </>
        </rb.Alert>
      )
    }

    return <></>
  }
)
