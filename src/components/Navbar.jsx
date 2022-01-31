import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import { walletDisplayName } from '../utils'

const WalletPreview = ({ wallet, walletInfo, unit, showBalance }) => {
  return (
    <div className="d-flex align-items-center text-body">
      <Sprite symbol="wallet" width="30" height="30" />
      <div style={{ fontSize: '14px' }} className="d-flex flex-column ms-2">
        {wallet && <div className="fw-normal">{walletDisplayName(wallet.name)}</div>}
        {walletInfo && walletInfo?.total_balance && unit ? (
          <div>
            <Balance value={walletInfo.total_balance} unit={unit} showBalance={showBalance || false} />
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

export default function Navbar({ connectionError }) {
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const currentWalletInfo = useCurrentWalletInfo()

  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <rb.Navbar
      bg={settings.theme === 'light' ? 'white' : 'dark'}
      sticky="top"
      expand="md"
      variant={settings.theme}
      expanded={isExpanded}
      onToggle={(expanded) => setIsExpanded(expanded)}
      className="border-bottom py-0"
    >
      <div className="container-xl align-items-stretch">
        {connectionError ? (
          <rb.Navbar.Text style={{ padding: '15px 0' }}>No Connection</rb.Navbar.Text>
        ) : (
          <>
            {!currentWallet ? (
              <>
                <Link to="/" className="navbar-brand" style={{ padding: '15px 0' }}>
                  <Sprite symbol="logo" width="30" height="30" className="d-inline-block align-top" />
                  <span className="ms-2">JoinMarket</span>
                </Link>
                <rb.Navbar.Toggle className="border-0" />
                <rb.Navbar.Collapse>
                  <rb.Nav className="ms-auto">
                    <Link to="/create-wallet" onClick={() => isExpanded && setIsExpanded(false)} className="nav-link">
                      Create Wallet
                    </Link>
                  </rb.Nav>
                </rb.Navbar.Collapse>
              </>
            ) : (
              <>
                <rb.Nav className="d-flex flex-1">
                  <NavLink to="/wallet" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    <span className="me-auto">
                      <div className="nav-item">
                        <WalletPreview
                          wallet={currentWallet}
                          walletInfo={currentWalletInfo}
                          showBalance={settings.showBalance}
                          unit={settings.unit}
                        />
                      </div>
                    </span>
                  </NavLink>
                </rb.Nav>
                <rb.Navbar.Toggle className="border-0" />
                <rb.Navbar.Collapse className="flex-1 flex-grow-0 align-items-stretch">
                  <ul className="navbar-nav justify-content-center align-items-stretch">
                    <NavLink
                      to="/send"
                      onClick={() => isExpanded && setIsExpanded(false)}
                      className={({ isActive }) =>
                        'nav-link d-flex align-items-center py-auto fw-bolder' + (isActive ? ' active' : '')
                      }
                    >
                      <li className="nav-item">Send</li>
                    </NavLink>
                    <NavLink
                      to="/receive"
                      onClick={() => isExpanded && setIsExpanded(false)}
                      className={({ isActive }) =>
                        'nav-link d-flex align-items-center py-auto fw-bolder mx-md-4' + (isActive ? ' active' : '')
                      }
                    >
                      <div className="nav-item">Receive </div>
                    </NavLink>
                    <NavLink
                      to="/earn"
                      onClick={() => isExpanded && setIsExpanded(false)}
                      className={({ isActive }) =>
                        'nav-link d-flex align-items-center py-auto fw-bolder' + (isActive ? ' active' : '')
                      }
                    >
                      <div className="nav-item"> Earn </div>
                    </NavLink>
                  </ul>
                </rb.Navbar.Collapse>
                <rb.Navbar.Collapse className="flex-1">
                  <span className="ms-auto">
                    <rb.Nav>
                      <Link
                        to="/settings"
                        onClick={() => isExpanded && setIsExpanded(false)}
                        className="nav-link px-0 py-2"
                      >
                        <Sprite symbol="gear" width="30" height="30" />
                      </Link>
                      <Link to="/" onClick={() => isExpanded && setIsExpanded(false)} className="nav-link px-0 py-2">
                        <Sprite symbol="grid" width="30" height="30" />
                      </Link>
                    </rb.Nav>
                  </span>
                </rb.Navbar.Collapse>
              </>
            )}
          </>
        )}
      </div>
    </rb.Navbar>
  )
}
