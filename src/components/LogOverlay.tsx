import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Helper as ApiHelper } from '../libs/JmWalletApi'
import { fetchLog } from '../libs/JamApi'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import { CurrentWallet } from '../context/WalletContext'
import Sprite from './Sprite'
import styles from './LogOverlay.module.css'

const JMWALLETD_LOG_FILE_NAME = 'jmwalletd_stdout.log'

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'
type LogLine = {
  level: LogLevel
  content: string
}

// exported for tests only
export const getLogLevel = (line: string): LogLevel => {
  // a line can - but does not necessarily need to - follow pattern "[date] [level] [text]"
  // e.g. 2009-01-03 19:04:10,057 [INFO] ...
  if (line.length <= 30 || line.charAt(24) !== '[') return 'INFO'

  const level = line.substring(25, 29)
  switch (level) {
    case 'DEBU':
      return 'DEBUG'
    case 'INFO':
      return 'INFO'
    case 'WARN':
      return 'WARNING'
    case 'ERRO':
      return 'ERROR'
    default:
      return 'INFO'
  }
}

interface LogContentProps {
  logLines: LogLine[]
  refresh: (signal: AbortSignal) => Promise<void>
}

export function LogContent({ logLines, refresh }: LogContentProps) {
  const logContentDivRef = useRef<HTMLDivElement>(null)
  const settings = useSettings()
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)

  useEffect(() => {
    if (logLines.length === 0 || !logContentDivRef.current) return

    logContentDivRef.current.scroll({
      top: logContentDivRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [logLines, logContentDivRef])

  return (
    <div className={styles.logContentContainer}>
      <div className={styles.titleBar}>
        <div className="d-flex justify-content-center align-items-center gap-2">
          <rb.Button
            className={styles.refreshButton}
            variant={settings.theme}
            onClick={() => {
              if (isLoadingRefresh) return

              setIsLoadingRefresh(true)

              const abortCtrl = new AbortController()
              refresh(abortCtrl.signal).finally(() => {
                // as refreshing is fast most of the time, add a short delay to avoid flickering
                setTimeout(() => setIsLoadingRefresh(false), 250)
              })
            }}
          >
            {isLoadingRefresh ? (
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              <Sprite symbol="refresh" width="24" height="24" />
            )}
          </rb.Button>
        </div>
      </div>
      <div className="px-md-3 pb-2">
        <div ref={logContentDivRef} className={styles.logContent}>
          {logLines.map((line, index) => (
            <code key={index} className={styles[line.level]}>
              {line.content}
              <br />
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}

type LogOverlayProps = rb.OffcanvasProps & {
  currentWallet: CurrentWallet
}

export function LogOverlay({ currentWallet, show, onHide }: LogOverlayProps) {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [logLines, setLogLines] = useState<LogLine[] | null>(null)

  const refresh = useCallback(
    (signal: AbortSignal) => {
      return fetchLog({ token: currentWallet.token, signal, fileName: JMWALLETD_LOG_FILE_NAME })
        .then((res) => (res.headers.get('Content-Type') === 'text/plain' ? res : ApiHelper.throwError(res)))
        .then((res) => (res.ok ? res.text() : ApiHelper.throwError(res)))
        .then((data) => {
          if (signal.aborted) return
          setAlert(null)

          const lines = (data ? data.split('\n') : []).map((line) => {
            return {
              level: getLogLevel(line),
              content: line,
            }
          })
          setLogLines(lines)
        })
        .catch((err) => {
          if (signal.aborted) return
          const message = err.message || t('logs.error_loading_logs_failed')
          setAlert({ variant: 'danger', message })
        })
        .finally(() => {
          if (signal.aborted) return
          setIsLoading(false)
        })
    },
    [currentWallet, t]
  )

  useEffect(() => {
    if (!show) {
      // don't keep content in memory longer than necessary
      setLogLines(null)
      return
    }

    const abortCtrl = new AbortController()

    setIsLoading(true)
    refresh(abortCtrl.signal).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsLoading(false)
      setIsInitialized(true)
    })

    return () => {
      abortCtrl.abort()
    }
  }, [show, refresh])

  return (
    <rb.Offcanvas
      className={`offcanvas-fullscreen ${styles.overlayContainer}`}
      show={show}
      onHide={onHide}
      placement="bottom"
    >
      <rb.Offcanvas.Header>
        <rb.Container>
          <div className="w-100 d-flex">
            <div className="d-flex align-items-center flex-1">
              <rb.Offcanvas.Title>{t('logs.title')}</rb.Offcanvas.Title>
            </div>
            <div>
              <rb.Button variant="link" className="unstyled pe-0" onClick={onHide}>
                <Sprite symbol="cancel" width="32" height="32" />
              </rb.Button>
            </div>
          </div>
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Container fluid="md" className="py-4 py-sm-5">
          {!isInitialized && isLoading ? (
            Array(12)
              .fill('')
              .map((_, index) => {
                return (
                  <rb.Placeholder key={index} as="div" animation="wave">
                    <rb.Placeholder xs={12} className={styles.logContentPlaceholder} />
                  </rb.Placeholder>
                )
              })
          ) : (
            <>
              {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
              {logLines && (
                <rb.Row>
                  <rb.Col>
                    <LogContent logLines={logLines} refresh={refresh} />
                  </rb.Col>
                </rb.Row>
              )}
            </>
          )}
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
