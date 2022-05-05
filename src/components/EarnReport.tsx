import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import * as Api from '../libs/JmWalletApi'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import styles from './EarnReport.module.css'

interface YielgenReportTableProps {
  lines: string[]
  maxAmountOfRows?: number
}

const YieldgenReportTable = ({ lines, maxAmountOfRows = 15 }: YielgenReportTableProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const empty = !lines || lines.length < 2
  const headers = empty ? [] : lines[0].split(',')

  const linesWithoutHeader = empty
    ? []
    : lines
        .slice(1, lines.length)
        .map((line) => line.split(','))
        .reverse()

  const visibleLines = linesWithoutHeader.slice(0, maxAmountOfRows)

  return (
    <>
      {empty ? (
        <rb.Alert variant="info">{t('earn.alert_empty_report')}</rb.Alert>
      ) : (
        <div>
          <rb.Table striped bordered hover variant={settings.theme} responsive>
            <thead>
              <tr>
                {headers.map((name, index) => (
                  <th key={`header_${index}`}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleLines.map((line, trIndex) => (
                <tr key={`tr_${trIndex}`}>
                  {line.map((val, tdIndex) => (
                    <td key={`td_${tdIndex}`}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {headers.map((name, index) => (
                  <th key={`footer_${index}`}>{name}</th>
                ))}
              </tr>
            </tfoot>
          </rb.Table>
          <div className="my-1 d-flex justify-content-end">
            <small>
              {t('earn.text_report_length', {
                visibleLines: visibleLines.length,
                linesWithoutHeader: linesWithoutHeader.length,
              })}
            </small>
          </div>
        </div>
      )}
    </>
  )
}

export function EarnReport() {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [yieldgenReportLines, setYieldgenReportLines] = useState<string[] | null>(null)

  useEffect(() => {
    setIsLoading(true)

    const abortCtrl = new AbortController()

    Api.getYieldgenReport({ signal: abortCtrl.signal })
      .then((res) => {
        if (res.ok) return res.json()
        // 404 is returned till the maker is started at least once
        if (res.status === 404) return { yigen_data: [] }
        return Api.Helper.throwError(res, t('earn.error_loading_report_failed'))
      })
      .then((data) => {
        if (abortCtrl.signal.aborted) return
        setYieldgenReportLines(data.yigen_data)
      })
      .catch((e) => {
        if (abortCtrl.signal.aborted) return
        setAlert({ variant: 'danger', message: e.message })
      })
      .finally(() => {
        if (abortCtrl.signal.aborted) return
        setIsLoading(false)
        setIsInitialized(true)
      })

    return () => {
      abortCtrl.abort()
    }
  }, [t])

  return (
    <div className="earn-report">
      {!isInitialized && isLoading ? (
        Array(5)
          .fill('')
          .map((_, index) => {
            return (
              <rb.Placeholder key={index} as="div" animation="wave">
                <rb.Placeholder xs={12} className={styles['report-line-placeholder']} />
              </rb.Placeholder>
            )
          })
      ) : (
        <>
          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
          {yieldgenReportLines && (
            <rb.Row>
              <rb.Col className="mb-3">
                <YieldgenReportTable lines={yieldgenReportLines} />
              </rb.Col>
            </rb.Row>
          )}
        </>
      )}
    </div>
  )
}

export function EarnReportOverlay({ show, onHide }: rb.OffcanvasProps) {
  const { t } = useTranslation()

  return (
    <rb.Offcanvas className={styles['report-overlay']} show={show} onHide={onHide} placement="bottom">
      <rb.Offcanvas.Header closeButton>
        <rb.Offcanvas.Title>{t('earn.report.title')}</rb.Offcanvas.Title>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <EarnReport />
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
