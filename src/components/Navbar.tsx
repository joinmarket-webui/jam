import { useCallback, useMemo, useState } from 'react'
import { Link, NavLink, To } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Sprite from './Sprite'
import Balance from './Balance'
import { TabActivityIndicator, JoiningIndicator } from './ActivityIndicators'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { CurrentWallet, useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import { useServiceInfo, useSessionConnectionError } from '../context/ServiceInfoContext'
import { routes } from '../constants/routes'
import { AmountSats } from '../libs/JmWalletApi'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'

import styles from './Navbar.module.css'

const BalanceLoadingIndicator = () => {
  return (
    <rb.Placeholder as="div" animation="wave">
      <rb.Placeholder className={styles.balancePlaceholder} />
    </rb.Placeholder>
  )
}

interface WalletPreviewProps {
  wallet: CurrentWallet
  rescanInProgress: boolean
  totalBalance?: AmountSats
  unit: Unit
  showBalance?: boolean
}

const WalletPreview = ({ wallet, rescanInProgress, totalBalance, unit, showBalance = false }: WalletPreviewProps) => {
  const { t } = useTranslation()

  return (
    <div className="d-flex align-items-center">
      <div className="d-flex align-items-center justify-content-center text-body" style={{ minWidth: '2rem' }}>
        <Sprite className={styles.walletSprite} symbol="wallet" width="30" height="30" />
        <rb.Spinner
          className={styles.loadingIndicator}
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
        />
      </div>
      <div className="d-flex flex-column ms-2 fs-6">
        {wallet && <div className="fw-normal">{wallet.displayName}</div>}
        <div className="text-body">
          {rescanInProgress ? (
            <div className="cursor-wait">{t('navbar.text_rescan_in_progress')}</div>
          ) : (
            <>
              {totalBalance === undefined ? (
                <BalanceLoadingIndicator />
              ) : (
                <Balance
                  valueString={`${totalBalance}`}
                  convertToUnit={unit}
                  showBalance={showBalance}
                  enableVisibilityToggle={false}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface CenterNavProps {
  makerRunning: boolean
  schedulerRunning: boolean
  singleCoinJoinRunning: boolean
  rescanInProgress: boolean
  onClick?: () => void
}

const CenterNav = ({
  makerRunning,
  schedulerRunning,
  singleCoinJoinRunning,
  rescanInProgress,
  onClick,
}: CenterNavProps) => {
  const { t } = useTranslation()

  return (
    <rb.Nav className="justify-content-center align-items-stretch">
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to={routes.receive}
          onClick={onClick}
          className={({ isActive }) =>
            classNames('center-nav-link nav-link d-flex align-items-center justify-content-center', {
              active: isActive,
              disabled: rescanInProgress,
            })
          }
        >
          {t('navbar.tab_receive')}
        </NavLink>
      </rb.Nav.Item>
      <div className="d-none d-md-flex align-items-center center-nav-link-divider">»</div>
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to={routes.send}
          onClick={onClick}
          className={({ isActive }) =>
            classNames('center-nav-link nav-link d-flex align-items-center justify-content-center', {
              active: isActive,
              disabled: rescanInProgress,
            })
          }
        >
          <div className="d-flex align-items-start">
            {t('navbar.tab_send')}
            <TabActivityIndicator isOn={singleCoinJoinRunning} className="ms-1" />
          </div>
        </NavLink>
      </rb.Nav.Item>
      <div className="d-none d-md-flex align-items-center center-nav-link-divider">»</div>
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to={routes.earn}
          onClick={onClick}
          className={({ isActive }) =>
            classNames('center-nav-link nav-link d-flex align-items-center justify-content-center', {
              active: isActive,
              disabled: rescanInProgress,
            })
          }
        >
          <div className="d-flex align-items-start">
            {t('navbar.tab_earn')}
            <TabActivityIndicator isOn={makerRunning} />
          </div>
        </NavLink>
      </rb.Nav.Item>
      <div className="d-none d-md-flex align-items-center center-nav-link-divider">|</div>
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to={routes.jam}
          onClick={onClick}
          className={({ isActive }) =>
            classNames('center-nav-link nav-link d-flex align-items-center justify-content-center', {
              active: isActive,
              disabled: rescanInProgress,
            })
          }
        >
          <div className="d-flex align-items-start">
            {t('navbar.tab_sweep')}
            <TabActivityIndicator isOn={schedulerRunning} />
          </div>
        </NavLink>
      </rb.Nav.Item>
    </rb.Nav>
  )
}

interface TrailingNavProps {
  joiningRoute?: To
  onClick?: () => void
}

const TrailingNav = ({ joiningRoute, onClick }: TrailingNavProps) => {
  const { t } = useTranslation()

  return (
    <rb.Nav className="justify-content-center align-items-stretch">
      {joiningRoute && (
        <rb.Nav.Item className="d-flex align-items-center">
          <NavLink
            to={joiningRoute}
            onClick={onClick}
            className="nav-link d-flex align-items-center justify-content-center"
          >
            <rb.Navbar.Text className="d-md-none">{t('navbar.joining_in_progress')}</rb.Navbar.Text>
            <JoiningIndicator
              isOn={true}
              className="navbar-text text-success"
              title={t('navbar.joining_in_progress')}
            />
          </NavLink>
        </rb.Nav.Item>
      )}
      {isDebugFeatureEnabled('fastThemeToggle') && (
        <rb.Nav.Item className="d-none d-md-flex align-items-center justify-content-center">
          <FastThemeToggle />
        </rb.Nav.Item>
      )}
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to={routes.settings}
          onClick={onClick}
          className={({ isActive }) =>
            'nav-link d-flex align-items-center justify-content-center' + (isActive ? ' active' : '')
          }
        >
          <Sprite symbol="gear" width="30" height="30" className="d-none d-md-inline-block" />
          <span className="d-inline-block d-md-none">{t('navbar.menu_mobile_settings')}</span>
        </NavLink>
      </rb.Nav.Item>
    </rb.Nav>
  )
}

function FastThemeToggle() {
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const isLightTheme = useMemo(() => settings.theme === window.JM.THEMES[0], [settings])

  const setTheme = useCallback(
    (theme: string) => {
      if (window.JM.THEMES.includes(theme)) {
        document.documentElement.setAttribute(window.JM.THEME_ROOT_ATTR, theme)
        settingsDispatch({ theme })
      }
    },
    [settingsDispatch],
  )

  return (
    <Sprite
      className="cursor-pointer"
      onClick={() => setTheme(isLightTheme ? window.JM.THEMES[1] : window.JM.THEMES[0])}
      symbol={isLightTheme ? window.JM.THEMES[0] : window.JM.THEMES[1]}
      width="30"
      height="30"
    />
  )
}

export default function Navbar() {
  const { t } = useTranslation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const currentWalletInfo = useCurrentWalletInfo()

  const serviceInfo = useServiceInfo()
  const sessionConnectionError = useSessionConnectionError()

  const [isExpanded, setIsExpanded] = useState(false)

  const makerRunning = useMemo(() => serviceInfo?.makerRunning === true, [serviceInfo])
  const rescanInProgress = useMemo(() => serviceInfo?.rescanning === true, [serviceInfo])
  const schedulerRunning = useMemo(
    () => (serviceInfo?.coinjoinInProgress && serviceInfo?.schedule !== null) || false,
    [serviceInfo],
  )
  const singleCoinJoinRunning = useMemo(
    () => (serviceInfo?.coinjoinInProgress && serviceInfo?.schedule === null) || false,
    [serviceInfo],
  )

  const joiningRoute = useMemo(() => {
    if (schedulerRunning) return routes.jam
    if (singleCoinJoinRunning) return routes.send
    if (makerRunning) return routes.earn

    return undefined
  }, [makerRunning, schedulerRunning, singleCoinJoinRunning])

  const height = '75px'

  return (
    <rb.Navbar
      id="mainNav"
      bg={settings.theme === 'light' ? 'white' : 'dark'}
      sticky="top"
      expand="md"
      variant={settings.theme}
      expanded={isExpanded}
      onToggle={(expanded) => setIsExpanded(expanded)}
      className="border-bottom py-0"
    >
      <rb.Container fluid="xl" className="align-items-stretch">
        {sessionConnectionError ? (
          <rb.Navbar.Text className="d-flex align-items-center" style={{ height: height }}>
            No Connection
          </rb.Navbar.Text>
        ) : (
          <>
            {!currentWallet ? (
              <>
                <Link
                  to={routes.home}
                  className="navbar-brand nav-link d-flex align-items-center ps-0 ps-sm-2 ps-xl-0"
                  style={{ height: height }}
                >
                  <Sprite symbol="logo" width="30" height="30" className="d-inline-block align-top" />
                  <span className="ms-2">{t('navbar.title')}</span>
                </Link>
                <div className="d-flex d-md-none align-items-center">
                  <rb.Navbar.Toggle id="mainNavToggle">
                    <span>{t('navbar.menu')}</span>
                  </rb.Navbar.Toggle>
                </div>
                {isDebugFeatureEnabled('fastThemeToggle') && (
                  <rb.Nav.Item className="d-none d-md-flex align-items-center pe-2">
                    <FastThemeToggle />
                  </rb.Nav.Item>
                )}
                <rb.Navbar.Offcanvas className={`navbar-offcanvas navbar-${settings.theme}`} placement="end">
                  <rb.Offcanvas.Header>
                    <rb.Offcanvas.Title>{t('navbar.title')}</rb.Offcanvas.Title>
                  </rb.Offcanvas.Header>
                  <rb.Offcanvas.Body className={styles.offcanvasBody}>
                    <rb.Nav className="ms-auto">
                      <rb.Nav.Item>
                        <NavLink
                          to={routes.createWallet}
                          onClick={() => isExpanded && setIsExpanded(false)}
                          className="nav-link d-flex align-items-center justify-content-center"
                        >
                          {t('navbar.button_create_wallet')}
                        </NavLink>
                      </rb.Nav.Item>
                      <rb.Nav.Item>
                        <NavLink
                          to={routes.importWallet}
                          onClick={() => isExpanded && setIsExpanded(false)}
                          className="nav-link d-flex align-items-center justify-content-center"
                        >
                          {t('navbar.button_import_wallet')}
                        </NavLink>
                      </rb.Nav.Item>
                    </rb.Nav>
                  </rb.Offcanvas.Body>
                </rb.Navbar.Offcanvas>
              </>
            ) : (
              <>
                <rb.Nav className="d-flex flex-1 align-items-stretch">
                  <rb.Nav.Item className="d-flex align-items-stretch">
                    <NavLink
                      to={routes.wallet}
                      style={{ height: height }}
                      className={({ isActive }) =>
                        'leading-nav-link nav-link d-flex align-items-center' + (isActive ? ' active' : '')
                      }
                    >
                      <WalletPreview
                        wallet={currentWallet}
                        rescanInProgress={rescanInProgress}
                        totalBalance={currentWalletInfo?.balanceSummary.calculatedTotalBalanceInSats}
                        showBalance={settings.showBalance}
                        unit={settings.unit}
                      />
                    </NavLink>
                  </rb.Nav.Item>
                </rb.Nav>
                <div className="d-flex d-md-none align-items-center">
                  <rb.Navbar.Toggle id="mainNavToggle">
                    <span>{t('navbar.menu_mobile')}</span>
                  </rb.Navbar.Toggle>
                </div>
                <rb.Navbar.Offcanvas className={`navbar-offcanvas navbar-${settings.theme}`} placement="end">
                  <rb.Offcanvas.Header>
                    <rb.Offcanvas.Title>{t('navbar.title')}</rb.Offcanvas.Title>
                  </rb.Offcanvas.Header>
                  <rb.Offcanvas.Body className={styles.offcanvasBody}>
                    <CenterNav
                      makerRunning={makerRunning}
                      schedulerRunning={schedulerRunning}
                      singleCoinJoinRunning={singleCoinJoinRunning}
                      rescanInProgress={rescanInProgress}
                      onClick={() => setIsExpanded(!isExpanded)}
                    />
                    <TrailingNav joiningRoute={joiningRoute} onClick={() => setIsExpanded(!isExpanded)} />
                  </rb.Offcanvas.Body>
                </rb.Navbar.Offcanvas>
                <rb.Container className="d-none d-md-flex flex-1 flex-grow-0 align-items-stretch">
                  <CenterNav
                    makerRunning={makerRunning}
                    schedulerRunning={schedulerRunning}
                    singleCoinJoinRunning={singleCoinJoinRunning}
                    rescanInProgress={rescanInProgress}
                  />
                </rb.Container>
                <rb.Container className="d-none d-md-flex flex-1 align-items-stretch">
                  <div className="ms-auto d-flex align-items-stretch">
                    <TrailingNav joiningRoute={joiningRoute} />
                  </div>
                </rb.Container>
              </>
            )}
          </>
        )}
      </rb.Container>
    </rb.Navbar>
  )
}
