import React from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { walletDisplayName } from '../utils'

export default function Navbar({ currentWallet, connectionError }) {
  return (
    <rb.Navbar bg="white" sticky="top" expand="md" variant="light" collapseOnSelect className="border-bottom">
      <div className="container-lg">
        {connectionError ? (
          <rb.Navbar.Text>No Connection</rb.Navbar.Text>
        ) : (
          <>
            {!currentWallet ? (
              <>
                <rb.Navbar.Brand>
                  <img src="/logo.svg" width="30" height="30" className="d-inline-block align-top" alt="JoinMarket" />
                  <span className="ms-2">JoinMarket</span>
                </rb.Navbar.Brand>
                <rb.Navbar.Toggle className="border-0" />
                <rb.Navbar.Collapse>
                  <rb.Nav className="ms-auto">
                    <Link to="/create-wallet" className="nav-link">
                      Create Wallet
                    </Link>
                  </rb.Nav>
                </rb.Navbar.Collapse>
              </>
            ) : (
              <>
                <Link to="/wallet" className="navbar-brand d-flex flex-1">
                  <span className="me-auto">{walletDisplayName(currentWallet.name)}</span>
                </Link>
                <rb.Navbar.Toggle className="border-0" />
                <rb.Navbar.Collapse className="flex-1 flex-grow-0">
                  <rb.Nav>
                    <Link to="/payment" className="nav-link fw-bolder">
                      Send
                    </Link>
                    <Link to="/receive" className="nav-link fw-bolder mx-md-4">
                      Receive
                    </Link>
                    <Link to="/earn" className="nav-link fw-bolder">
                      Earn
                    </Link>
                  </rb.Nav>
                </rb.Navbar.Collapse>
                <rb.Navbar.Collapse className="flex-1">
                  <span className="ms-auto">
                    <rb.Nav>
                      <Link to="/" className="nav-link">
                        <svg
                          stroke="currentColor"
                          fill="currentColor"
                          stroke-width="0"
                          viewBox="0 0 512 512"
                          height="1em"
                          width="1em"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            width="416"
                            height="288"
                            x="48"
                            y="144"
                            fill="none"
                            stroke-linejoin="round"
                            stroke-width="32"
                            rx="48"
                            ry="48"
                          ></rect>
                          <path
                            fill="none"
                            stroke-linejoin="round"
                            stroke-width="32"
                            d="M411.36 144v-30A50 50 0 00352 64.9L88.64 109.85A50 50 0 0048 159v49"
                          ></path>
                          <path d="M368 320a32 32 0 1132-32 32 32 0 01-32 32z"></path>
                        </svg>
                      </Link>
                      <Link to="/settings" className="nav-link">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="1rem"
                          height="1rem"
                          fill="currentColor"
                          className="ms-0"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
                        </svg>
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
