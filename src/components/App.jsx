import { useState, useEffect, useRef } from "react";
import { Route, Routes, Link } from "react-router-dom";
import * as rb from "react-bootstrap";
import Wallets from "./Wallets";
import CreateWallet from "./CreateWallet";
import Send from "./Send";
import Earn from "./Earn";
import Receive from "./Receive";
import CurrentWallet from "./CurrentWallet";
import { getSession, setSession, clearSession } from "../session";
import { walletDisplayName } from "../utils";

export default function App() {
  const [currentWallet, setCurrentWallet] = useState();
  const [makerRunning, setMakerRunning] = useState();
  const [connectionError, setConnectionError] = useState();
  const [coinjoinInProcess, setCoinjoinInProcess] = useState();
  const websocket = useRef(null);

  const startWallet = (name, token) => {
    setSession(name, token);
    setCurrentWallet({ name, token });

    const { protocol, host } = window.location;
    const scheme = protocol === "https:" ? "wss" : "ws";
    websocket.current = new WebSocket(`${scheme}://${host}/ws/`);

    websocket.current.onopen = () => {
      console.debug("websocket connection openend");
      websocket.current.send(token);
    };

    websocket.current.onerror = (error) => {
      console.error("websocket error", error);
    };

    websocket.current.onmessage = (event) => {
      // For now we only have one message type, namely the transaction notification:
      // For now, note that since the `getUtxos` function is called on every render of
      // the display page, we don't need to somehow use this data other than as some
      // kind of popup/status bar notifier.
      // In future it might be possible to use the detailed transaction deserialization
      // passed in this notification, for something.
      const wsdata = JSON.parse(event.data);
      console.debug("websocket sent", wsdata);
    };

    const wsCurrent = websocket.current;
    return () => {
      wsCurrent.close();
    };
  };

  const stopWallet = () => {
    clearSession();
    setCurrentWallet(null);

    if (websocket) {
      websocket.current.onclose = () => {
        console.debug("websocket connection closed");
      };
      websocket.current.close();
    }
  };

  useEffect(() => {
    const abortCtrl = new AbortController();

    const resetState = () => {
      setCurrentWallet(null);
      setMakerRunning(null);
      setCoinjoinInProcess(null);
    };

    const refreshSession = () => {
      const opts = { signal: abortCtrl.signal };

      fetch("/api/v1/session", opts)
        .then((res) =>
          res.ok ? res.json() : Promise.reject(new Error(res.statusText))
        )
        .then((data) => {
          const { maker_running, coinjoin_in_process, wallet_name } = data;
          const activeWallet = wallet_name !== "None" ? wallet_name : null;

          setConnectionError(null);
          setMakerRunning(maker_running);
          setCoinjoinInProcess(coinjoin_in_process);
          if (
            currentWallet &&
            (!activeWallet || currentWallet.name !== activeWallet)
          ) {
            setCurrentWallet(null);
            clearSession();
          }
        })
        .catch((err) => {
          if (!abortCtrl.signal.aborted) {
            setConnectionError(err.message);
            resetState();
          }
        });
    };
    refreshSession();
    const interval = setInterval(refreshSession, 10000);
    return () => {
      abortCtrl.abort();
      clearInterval(interval);
    };
  }, [currentWallet]);

  useEffect(() => {
    const session = getSession();
    if (session) {
      return startWallet(session.name, session.token);
    }
  }, []);

  const nav = connectionError ? null : (
    <rb.Nav className="text-start">
      {currentWallet ? (
        <>
          <Link to="/payment" className="nav-link">
            Send
          </Link>
          <Link to="/receive" className="nav-link">
            Receive
          </Link>
        </>
      ) : (
        <Link to="/create-wallet" className="nav-link">
          Create Wallet
        </Link>
      )}
    </rb.Nav>
  );

  return (
    <>
      <rb.Navbar
        as="header"
        sticky="top"
        expand="lg"
        bg="white"
        variant="light"
        collapseOnSelect
        className="border-bottom"
      >
        <rb.Container>
          <Link
            to="/"
            className="navbar-brand d-inline-flex align-items-center pt-1"
          >
            <img
              src="/logo.svg"
              width="30"
              height="30"
              className="d-inline-block align-top"
              alt="JoinMarket"
            />
            <span className="ms-2">JoinMarket</span>
          </Link>
          {connectionError ? (
            <rb.Navbar>
              <rb.Navbar.Text>No Connection</rb.Navbar.Text>
            </rb.Navbar>
          ) : (
            <>
              <rb.Navbar.Toggle
                aria-controls="navbarOffcanvas"
                className="ms-auto border-0 order-sm-1"
              />
              <rb.Navbar className="d-none d-lg-flex">{nav}</rb.Navbar>
              <rb.Navbar.Offcanvas id="navbarOffcanvas">
                <rb.Offcanvas.Body>{nav}</rb.Offcanvas.Body>
              </rb.Navbar.Offcanvas>
              {currentWallet && (
                <rb.Nav className="ms-sm-auto ms-lg-0 d-block order-sm-0">
                  <Link to="/wallet" className="nav-link d-inline-block">
                    {walletDisplayName(currentWallet.name)}
                  </Link>
                  <rb.Navbar.Text> · </rb.Navbar.Text>
                  <Link
                    to="/earn"
                    className="nav-link d-inline-flex align-items-center"
                  >
                    Earn
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.5rem"
                      height="1.5rem"
                      fill="currentColor"
                      className="ms-2"
                      viewBox="0 0 16 16"
                    >
                      {makerRunning ? (
                        <path d="M5 3a5 5 0 0 0 0 10h6a5 5 0 0 0 0-10H5zm6 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                      ) : (
                        <path d="M11 4a4 4 0 0 1 0 8H8a4.992 4.992 0 0 0 2-4 4.992 4.992 0 0 0-2-4h3zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5z" />
                      )}
                    </svg>
                  </Link>
                  {coinjoinInProcess && (
                    <rb.Navbar.Text>
                      {" "}
                      · Joining
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1.5rem"
                        height="1.5rem"
                        fill="currentColor"
                        className="ms-2"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                        <path d="M9.5 2c-.9 0-1.75.216-2.501.6A5 5 0 0 1 13 7.5a6.5 6.5 0 1 1-13 0 .5.5 0 0 1 1 0 5.5 5.5 0 0 0 8.001 4.9A5 5 0 0 1 3 7.5a6.5 6.5 0 0 1 13 0 .5.5 0 0 1-1 0A5.5 5.5 0 0 0 9.5 2zM8 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                      </svg>
                    </rb.Navbar.Text>
                  )}
                </rb.Nav>
              )}
            </>
          )}
        </rb.Container>
      </rb.Navbar>
      <rb.Container as="main" className="py-4">
        {connectionError ? (
          <rb.Alert variant="danger">
            No connection to backend: {connectionError}.
          </rb.Alert>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Wallets
                  currentWallet={currentWallet}
                  startWallet={startWallet}
                  stopWallet={stopWallet}
                />
              }
            />
            <Route
              path="create-wallet"
              element={
                <CreateWallet
                  currentWallet={currentWallet}
                  startWallet={startWallet}
                />
              }
            />
            {currentWallet && (
              <>
                <Route
                  path="wallet"
                  element={<CurrentWallet currentWallet={currentWallet} />}
                />
                <Route
                  path="payment"
                  element={<Send currentWallet={currentWallet} />}
                />
                <Route
                  path="earn"
                  element={
                    <Earn
                      currentWallet={currentWallet}
                      makerRunning={makerRunning}
                      coinjoinInProcess={coinjoinInProcess}
                    />
                  }
                />
                <Route
                  path="receive"
                  element={<Receive currentWallet={currentWallet} />}
                />
              </>
            )}
          </Routes>
        )}
      </rb.Container>
      <rb.Nav as="footer" className="border-top py-2">
        <rb.Container className="d-flex justify-content-center">
          <rb.Nav.Item>
            <a
              href="https://github.com/JoinMarket-Org/joinmarket-clientserver/tree/master/docs"
              target="_blank"
              rel="noreferrer"
              className="nav-link text-secondary"
            >
              Docs
            </a>
          </rb.Nav.Item>
          <rb.Nav.Item>
            <a
              href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features"
              target="_blank"
              rel="noreferrer"
              className="nav-link text-secondary"
            >
              Features
            </a>
          </rb.Nav.Item>
          <rb.Nav.Item>
            <a
              href="https://github.com/JoinMarket-Org/joinmarket-clientserver"
              target="_blank"
              rel="noreferrer"
              className="nav-link text-secondary"
            >
              GitHub
            </a>
          </rb.Nav.Item>
          <rb.Nav.Item>
            <a
              href="https://twitter.com/joinmarket"
              target="_blank"
              rel="noreferrer"
              className="nav-link text-secondary"
            >
              Twitter
            </a>
          </rb.Nav.Item>
        </rb.Container>
      </rb.Nav>
    </>
  );
}
