import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import Balance from './Balance'
import { EarnIndicator, JoiningIndicator } from './ActivityIndicators'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import { useServiceInfo, useSessionConnectionError } from '../context/ServiceInfoContext'
import { walletDisplayName } from '../utils'
import RBNav from 'react-bootstrap/Nav'
import RBNavbar from 'react-bootstrap/Navbar'
import Container from 'react-bootstrap/Container'
import Offcanvas from 'react-bootstrap/Offcanvas'

const WalletPreview = ({ wallet, walletInfo, unit, showBalance }) => {
  return (
    <div className="d-flex align-items-center">
      <Sprite symbol="wallet" width="30" height="30" className="text-body" />
      <div className="d-flex flex-column ms-2 fs-6">
        {wallet && <div className="fw-normal">{walletDisplayName(wallet.name)}</div>}
        {walletInfo && walletInfo?.total_balance && unit ? (
          <div className="text-body">
            <Balance valueString={walletInfo.total_balance} convertToUnit={unit} showBalance={showBalance || false} />
          </div>
        ) : (
          <div className="invisible">
            <Balance value="0.00000000" unit="BTC" showBalance={false} />
          </div>
        )}
      </div>
    </div>
  )
}

const CenterNav = ({ makerRunning, onClick }) => {
  const { t } = useTranslation()
  return (
    <RBNav className="justify-content-center align-items-stretch">
      <RBNav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/send"
          onClick={onClick}
          className={({ isActive }) =>
            'center-nav-link nav-link d-flex align-items-center justify-content-center' + (isActive ? ' active' : '')
          }
        >
          {t('navbar.tab_send')}
        </NavLink>
      </RBNav.Item>
      <RBNav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/receive"
          onClick={onClick}
          className={({ isActive }) =>
            'center-nav-link nav-link d-flex align-items-center justify-content-center' + (isActive ? ' active' : '')
          }
        >
          {t('navbar.tab_receive')}
        </NavLink>
      </RBNav.Item>
      <RBNav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/earn"
          onClick={onClick}
          className={({ isActive }) =>
            'center-nav-link nav-link d-flex align-items-center justify-content-center' + (isActive ? ' active' : '')
          }
        >
          <div className="d-flex align-items-start">
            {t('navbar.tab_earn')}
            <EarnIndicator isOn={makerRunning} />
          </div>
        </NavLink>
      </RBNav.Item>
    </RBNav>
  )
}

const TrailingNav = ({ coinjoinInProgess, onClick }) => {
  const { t } = useTranslation()

  return (
    <RBNav className="justify-content-center align-items-stretch">
      {coinjoinInProgess && (
        <RBNav.Item className="d-flex align-items-center justify-content-center pe-2">
          <div className="d-flex align-items-center px-0">
            <RBNavbar.Text>{t('navbar.joining_in_progress')}</RBNavbar.Text>
            <JoiningIndicator isOn={coinjoinInProgess} className="navbar-text" />
          </div>
        </RBNav.Item>
      )}
      <RBNav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/settings"
          onClick={onClick}
          className={({ isActive }) =>
            'nav-link d-flex align-items-center justify-content-center px-0' + (isActive ? ' active' : '')
          }
        >
          <Sprite symbol="gear" width="30" height="30" className="d-none d-md-inline-block" />
          <span className="d-inline-block d-md-none">{t('navbar.menu_mobile_settings')}</span>
        </NavLink>
      </RBNav.Item>
      <RBNav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/"
          onClick={onClick}
          className={({ isActive }) =>
            'nav-link d-flex align-items-center justify-content-center px-0' + (isActive ? ' active' : '')
          }
        >
          <Sprite symbol="grid" width="30" height="30" className="d-none d-md-inline-block" />
          <span className="d-inline-block d-md-none">{t('navbar.menu_mobile_wallets')}</span>
        </NavLink>
      </RBNav.Item>
    </RBNav>
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

  const height = '75px'

  return (
    <RBNavbar
      id="mainNav"
      bg={settings.theme === 'light' ? 'white' : 'dark'}
      sticky="top"
      expand="md"
      variant={settings.theme}
      expanded={isExpanded}
      onToggle={(expanded) => setIsExpanded(expanded)}
      className="border-bottom py-0"
    >
      <Container fluid="xl" className="align-items-stretch">
        {sessionConnectionError ? (
          <RBNavbar.Text className="d-flex align-items-center" style={{ height: height }}>
            No Connection
          </RBNavbar.Text>
        ) : (
          <>
            {!currentWallet ? (
              <>
                <Link
                  to="/"
                  className="navbar-brand nav-link d-flex align-items-center ps-0 ps-sm-2 ps-xl-0"
                  style={{ height: height }}
                >
                  <Sprite symbol="logo" width="30" height="30" className="d-inline-block align-top" />
                  <span className="ms-2">{t('navbar.title')}</span>
                </Link>
                <div className="d-flex d-md-none align-items-center">
                  <RBNavbar.Toggle id="mainNavToggle">
                    <span>{t('navbar.menu')}</span>
                  </RBNavbar.Toggle>
                </div>
                <RBNavbar.Offcanvas className={`navbar-${settings.theme}`} placement="end">
                  <Offcanvas.Header>
                    <Offcanvas.Title>{t('navbar.title')}</Offcanvas.Title>
                  </Offcanvas.Header>
                  <Offcanvas.Body>
                    <RBNav className="ms-auto">
                      <RBNav.Item>
                        <Link
                          to="/create-wallet"
                          onClick={() => isExpanded && setIsExpanded(false)}
                          className="nav-link"
                        >
                          {t('navbar.button_create_wallet')}
                        </Link>
                      </RBNav.Item>
                    </RBNav>
                  </Offcanvas.Body>
                </RBNavbar.Offcanvas>
              </>
            ) : (
              <>
                <RBNav className="d-flex flex-1 align-items-stretch">
                  <RBNav.Item className="d-flex align-items-stretch">
                    <NavLink
                      to="/wallet"
                      style={{ height: height }}
                      className={({ isActive }) =>
                        'leading-nav-link nav-link d-flex align-items-center' + (isActive ? ' active' : '')
                      }
                    >
                      <>
                        <WalletPreview
                          wallet={currentWallet}
                          walletInfo={currentWalletInfo}
                          showBalance={settings.showBalance}
                          unit={settings.unit}
                        />
                      </>
                    </NavLink>
                  </RBNav.Item>
                </RBNav>
                <div className="d-flex d-md-none align-items-center">
                  <RBNavbar.Toggle id="mainNavToggle">
                    <span>{t('navbar.menu_mobile')}</span>
                  </RBNavbar.Toggle>
                </div>
                <RBNavbar.Offcanvas className={`navbar-${settings.theme}`} placement="end">
                  <Offcanvas.Header>
                    <Offcanvas.Title>{t('navbar.title')}</Offcanvas.Title>
                  </Offcanvas.Header>
                  <Offcanvas.Body>
                    <CenterNav makerRunning={serviceInfo?.makerRunning} onClick={() => setIsExpanded(!isExpanded)} />
                    <TrailingNav
                      coinjoinInProgess={serviceInfo?.coinjoinInProgress}
                      onClick={() => setIsExpanded(!isExpanded)}
                    />
                  </Offcanvas.Body>
                </RBNavbar.Offcanvas>
                <Container className="d-none d-md-flex flex-1 flex-grow-0 align-items-stretch">
                  <CenterNav makerRunning={serviceInfo?.makerRunning} />
                </Container>
                <Container className="d-none d-md-flex flex-1 align-items-stretch">
                  <div className="ms-auto d-flex align-items-stretch">
                    <TrailingNav coinjoinInProgess={serviceInfo?.coinjoinInProgress} />
                  </div>
                </Container>
              </>
            )}
          </>
        )}
      </Container>
    </RBNavbar>
  )
}
