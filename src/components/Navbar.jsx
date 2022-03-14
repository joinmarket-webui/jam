import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import { useSessionInfo, useSessionConnectionError } from '../context/SessionInfoContext'
import { walletDisplayName } from '../utils'

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

const ActivityIndicator = ({ isOn }) => {
  return <span className={`activity-indicator ${isOn ? 'activity-indicator-on' : 'activity-indicator-off'}`} />
}

const CenterNav = ({ makerRunning, onClick }) => {
  return (
    <rb.Nav className="justify-content-center align-items-stretch">
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/send"
          onClick={onClick}
          className={({ isActive }) =>
            'center-nav-link nav-link d-flex align-items-center justify-content-center' + (isActive ? ' active' : '')
          }
        >
          Send
        </NavLink>
      </rb.Nav.Item>
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/receive"
          onClick={onClick}
          className={({ isActive }) =>
            'center-nav-link nav-link d-flex align-items-center justify-content-center' + (isActive ? ' active' : '')
          }
        >
          Receive
        </NavLink>
      </rb.Nav.Item>
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/earn"
          onClick={onClick}
          className={({ isActive }) =>
            'center-nav-link nav-link d-flex align-items-center justify-content-center' + (isActive ? ' active' : '')
          }
        >
          <div className="d-flex align-items-start">
            Earn
            <ActivityIndicator isOn={makerRunning} />
          </div>
        </NavLink>
      </rb.Nav.Item>
    </rb.Nav>
  )
}

const TrailingNav = ({ coinjoinInProcess, onClick }) => {
  return (
    <rb.Nav className="justify-content-center align-items-stretch">
      {coinjoinInProcess && (
        <rb.Nav.Item className="d-flex align-items-center justify-content-center pe-2">
          <div className="d-flex align-items-center px-0">
            <rb.Navbar.Text>Joining</rb.Navbar.Text>
            <Sprite symbol="joining" width="30" height="30" className="p-1 navbar-text" />
          </div>
        </rb.Nav.Item>
      )}
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/settings"
          onClick={onClick}
          className={({ isActive }) =>
            'nav-link d-flex align-items-center justify-content-center px-0' + (isActive ? ' active' : '')
          }
        >
          <Sprite symbol="gear" width="30" height="30" className="d-none d-md-inline-block" />
          <span className="d-inline-block d-md-none">Settings</span>
        </NavLink>
      </rb.Nav.Item>
      <rb.Nav.Item className="d-flex align-items-stretch">
        <NavLink
          to="/"
          onClick={onClick}
          className={({ isActive }) =>
            'nav-link d-flex align-items-center justify-content-center px-0' + (isActive ? ' active' : '')
          }
        >
          <Sprite symbol="grid" width="30" height="30" className="d-none d-md-inline-block" />
          <span className="d-inline-block d-md-none">Wallets</span>
        </NavLink>
      </rb.Nav.Item>
    </rb.Nav>
  )
}

export default function Navbar() {
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const currentWalletInfo = useCurrentWalletInfo()

  const sessionInfo = useSessionInfo()
  const sessionConnectionError = useSessionConnectionError()

  const [isExpanded, setIsExpanded] = useState(false)

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
                  to="/"
                  className="navbar-brand nav-link d-flex align-items-center ps-0 ps-sm-2 ps-xl-0"
                  style={{ height: height }}
                >
                  <Sprite symbol="logo" width="30" height="30" className="d-inline-block align-top" />
                  <span className="ms-2">Jam</span>
                </Link>
                <div className="d-flex d-md-none align-items-center">
                  <rb.Navbar.Toggle id="mainNavToggle">
                    <span>Menu</span>
                  </rb.Navbar.Toggle>
                </div>
                <rb.Navbar.Offcanvas className={`navbar-${settings.theme}`} placement="end">
                  <rb.Offcanvas.Header>
                    <rb.Offcanvas.Title>Jam</rb.Offcanvas.Title>
                  </rb.Offcanvas.Header>
                  <rb.Offcanvas.Body>
                    <rb.Nav className="ms-auto">
                      <rb.Nav.Item>
                        <Link
                          to="/create-wallet"
                          onClick={() => isExpanded && setIsExpanded(false)}
                          className="nav-link"
                        >
                          Create Wallet
                        </Link>
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
                  </rb.Nav.Item>
                </rb.Nav>
                <div className="d-flex d-md-none align-items-center">
                  <rb.Navbar.Toggle id="mainNavToggle">
                    <span>Menu</span>
                  </rb.Navbar.Toggle>
                </div>
                <rb.Navbar.Offcanvas className={`navbar-${settings.theme}`} placement="end">
                  <rb.Offcanvas.Header>
                    <rb.Offcanvas.Title>Jam</rb.Offcanvas.Title>
                  </rb.Offcanvas.Header>
                  <rb.Offcanvas.Body>
                    <CenterNav makerRunning={sessionInfo?.makerRunning} onClick={() => setIsExpanded(!isExpanded)} />
                    <TrailingNav
                      coinjoinInProcess={sessionInfo?.coinjoinInProcess}
                      onClick={() => setIsExpanded(!isExpanded)}
                    />
                  </rb.Offcanvas.Body>
                </rb.Navbar.Offcanvas>
                <rb.Container className="d-none d-md-flex flex-1 flex-grow-0 align-items-stretch">
                  <CenterNav makerRunning={sessionInfo?.makerRunning} />
                </rb.Container>
                <rb.Container className="d-none d-md-flex flex-1 align-items-stretch">
                  <div className="ms-auto d-flex align-items-stretch">
                    <TrailingNav coinjoinInProcess={sessionInfo?.coinjoinInProcess} />
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
