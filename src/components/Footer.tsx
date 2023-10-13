import { useState, useEffect, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { useWebsocketState } from '../context/WebsocketContext'
import { useCurrentWallet } from '../context/WalletContext'
import Sprite from './Sprite'
import Cheatsheet from './Cheatsheet'
import packageInfo from '../../package.json'
import { isDevMode } from '../constants/debugFeatures'
import { toSemVer } from '../utils'

const APP_DISPLAY_VERSION = (() => {
  const version = toSemVer(packageInfo.version)
  return !isDevMode() ? version.raw : `${version.major}.${version.minor}.${version.patch + 1}dev`
})()

export default function Footer() {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const settings = useSettings()
  const serviceInfo = useServiceInfo()
  const settingsDispatch = useSettingsDispatch()
  const websocketState = useWebsocketState()

  const [showBetaWarning, setShowBetaWarning] = useState(false)
  const [showCheatsheet, setShowCheatsheet] = useState(false)

  const cheatsheetEnabled = useMemo(() => !!currentWallet, [currentWallet])
  const websocketConnected = useMemo(() => websocketState === WebSocket.OPEN, [websocketState])

  useEffect(() => {
    let timer: NodeJS.Timeout
    // show the cheatsheet once after the first wallet has been created
    if (cheatsheetEnabled && settings.showCheatsheet) {
      timer = setTimeout(() => {
        setShowCheatsheet(true)
        settingsDispatch({ showCheatsheet: false })
      }, 1_000)
    }

    return () => clearTimeout(timer)
  }, [cheatsheetEnabled, settings, settingsDispatch])

  return (
    <>
      {showBetaWarning && (
        <div className="warning-card-wrapper">
          <rb.Card className="warning-card translate-middle shadow-lg">
            <rb.Card.Body>
              <rb.Card.Title className="text-center mb-3">{t('footer.warning_alert_title')}</rb.Card.Title>
              <p>{t('footer.warning_alert_text')}</p>
              <p className="text-secondary">
                JoinMarket: v{serviceInfo?.server?.version?.raw || 'unknown'}
                <br />
                Jam: v{APP_DISPLAY_VERSION}
              </p>
              <div className="text-center mt-3">
                <rb.Button variant="dark" onClick={() => setShowBetaWarning(false)}>
                  {t('footer.warning_alert_button_ok')}
                </rb.Button>
              </div>
            </rb.Card.Body>
          </rb.Card>
        </div>
      )}

      <rb.Nav as="footer" className="border-top py-2">
        <rb.Container fluid="xl" className="d-flex justify-content-center py-2 px-4">
          <div className="d-none d-md-flex flex-1 order-0 justify-content-start align-items-center">
            <div className="warning-hint text-start text-secondary">
              <Trans i18nKey="footer.warning">
                This is pre-alpha software.
                <rb.Button
                  variant="link"
                  className="warning-hint text-start border-0 p-0 text-secondary"
                  onClick={() => setShowBetaWarning(true)}
                >
                  Read this before using.
                </rb.Button>
              </Trans>
            </div>
          </div>
          <div className="d-flex order-1 flex-1 flex-grow-0 justify-content-center align-items-center pt-0">
            {cheatsheetEnabled && (
              <div className="order-1 order-sm-0">
                <Cheatsheet show={showCheatsheet} onHide={() => setShowCheatsheet(false)} />
                <rb.Nav.Item>
                  <rb.Button
                    variant="link"
                    className="cheatsheet-link nav-link text-start border-0 px-2"
                    onClick={() => setShowCheatsheet(true)}
                  >
                    <div className="d-flex justify-content-center align-items-center">
                      <Sprite symbol="file-outline" width="24" height="24" />
                      <div className="ps-0">{t('footer.cheatsheet')}</div>
                    </div>
                  </rb.Button>
                </rb.Nav.Item>
              </div>
            )}
          </div>
          <div className="d-flex flex-1 order-2 justify-content-end align-items-center gap-1">
            <div className="warning-hint text-start text-secondary d-none d-md-block pe-1">
              <a
                href="https://github.com/joinmarket-webui/jam/tags"
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-secondary"
              >
                v{APP_DISPLAY_VERSION}
              </a>
            </div>
            <div className="d-flex gap-2 pe-2">
              <a
                href="https://github.com/joinmarket-webui/jam"
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-secondary"
              >
                <Sprite symbol="github" width="18px" height="18px" />
              </a>
              <a
                href="https://t.me/JoinMarketWebUI"
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-secondary"
              >
                <Sprite symbol="telegram" width="18px" height="18px" />
              </a>
            </div>
            <div className="d-flex text-secondary">|</div>
            <div className="d-flex">
              <rb.OverlayTrigger
                delay={{ hide: 300, show: 200 }}
                placement="top"
                overlay={(props) => (
                  <rb.Tooltip {...props}>
                    {websocketConnected ? (
                      <>{t('footer.websocket_connected')}</>
                    ) : (
                      <>{t('footer.websocket_disconnected')}</>
                    )}
                  </rb.Tooltip>
                )}
              >
                <span
                  className={`mx-1 ${websocketConnected ? 'text-success' : 'text-secondary'}`}
                  data-testid="connection-indicator-icon"
                >
                  <Sprite symbol="node" width="24px" height="24px" />
                </span>
              </rb.OverlayTrigger>
            </div>
          </div>
        </rb.Container>
      </rb.Nav>
    </>
  )
}
