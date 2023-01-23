import React, { useCallback, useEffect, useRef, useState } from 'react'
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

interface LogContentProps {
  content: string
  refresh: (signal: AbortSignal) => Promise<void>
}

export function LogContent({ content, refresh }: LogContentProps) {
  const logContentRef = useRef<HTMLPreElement>(null)
  const settings = useSettings()
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)

  useEffect(() => {
    if (!content || !logContentRef.current) return

    logContentRef.current.scroll({
      top: logContentRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [content, logContentRef])

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
      <div className="py-2 px-2">
        <pre ref={logContentRef} className={styles.logContent}>
          {content}
        </pre>
      </div>
    </div>
  )
}

type LogOverlayProps = rb.OffcanvasProps & {
  currentWallet: CurrentWallet
}

export function LogOverlay({ currentWallet, show, onHide }: LogOverlayProps) {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<SimpleAlert>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState<string | null>(null)

  const refresh = useCallback(
    (signal: AbortSignal) => {
      return fetchLog({ token: currentWallet.token, signal, fileName: JMWALLETD_LOG_FILE_NAME })
        .then((res) => (res.ok ? res.text() : ApiHelper.throwError(res)))
        .then((data) => {
          if (signal.aborted) return
          setAlert(undefined)
          setContent(data)
        })
        .catch((err) => {
          if (signal.aborted) return
          setAlert({ variant: 'danger', message: t('logs.error_loading_logs_failed') })
        })
        .finally(() => {
          if (signal.aborted) return
          setIsLoading(false)
        })
    },
    [currentWallet, t]
  )

  useEffect(() => {
    if (!show) return

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
        <rb.Container fluid="lg">
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
        <rb.Container fluid="lg" className="py-3">
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
              {content && (
                <rb.Row>
                  <rb.Col className="px-0">
                    <LogContent content={content} refresh={refresh} />
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
