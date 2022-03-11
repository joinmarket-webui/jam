import React, { useState, useEffect, useReducer } from 'react'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { SATS, BTC } from '../utils'
import { useCurrentWallet } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'
import { useTranslation } from 'react-i18next'
import languages from '../i18n/languages'

const JamSettings = () => {
  const currentWallet = useCurrentWallet()
  const [seed, setSeed] = useState('')
  const [showingSeed, setShowingSeed] = useState(false)
  const [revealSeed, setRevealSeed] = useState(false)
  const [seedError, setSeedError] = useState(false)
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const { i18n } = useTranslation()

  const setTheme = (theme) => {
    if (window.JM.THEMES.includes(theme)) {
      document.documentElement.setAttribute(window.JM.THEME_ROOT_ATTR, theme)
      settingsDispatch({ theme })
    }
  }

  const isSats = settings.unit === SATS
  const isLightTheme = settings.theme === window.JM.THEMES[0]

  return (
    <div>
      <div style={{ marginLeft: '-.75rem' }}>
        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => {
            e.preventDefault()
            settingsDispatch({ showBalance: !settings.showBalance })
          }}
        >
          <Sprite symbol={settings.showBalance ? 'hide' : 'show'} width="24" height="24" className="me-2" />
          {settings.showBalance ? 'Hide' : 'Show'} balance
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => {
            e.preventDefault()
            settingsDispatch({ unit: isSats ? BTC : SATS })
          }}
        >
          <Sprite symbol={isSats ? BTC : SATS} width="24" height="24" className="me-2" />
          Display amounts in {isSats ? BTC : SATS}
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => {
            e.preventDefault()
            setTheme(isLightTheme ? window.JM.THEMES[1] : window.JM.THEMES[0])
          }}
        >
          <Sprite
            symbol={isLightTheme ? window.JM.THEMES[0] : window.JM.THEMES[1]}
            width="24"
            height="24"
            className="me-2"
          />
          Switch to {isLightTheme ? 'dark' : 'light'} theme
        </rb.Button>

        <br />

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={(e) => {
            e.preventDefault()
            settingsDispatch({ useAdvancedWalletMode: !settings.useAdvancedWalletMode })
          }}
        >
          <Sprite
            symbol={settings.useAdvancedWalletMode ? 'wand' : 'console'}
            width="24"
            height="24"
            className="me-2"
          />
          Use {settings.useAdvancedWalletMode ? 'magic' : 'advanced'} wallet mode
        </rb.Button>

        <br />

        <rb.Dropdown>
          <rb.Dropdown.Toggle variant="outline-dark" className="border-0 mb-2 d-inline-flex align-items-center">
            <Sprite symbol="globe" width="24" height="24" className="me-2" />
            {languages.find((lng) => lng.key === (i18n.resolvedLanguage || i18n.language))?.description ||
              languages[0].description}
          </rb.Dropdown.Toggle>

          <rb.Dropdown.Menu variant={settings.theme === 'light' ? 'light' : 'dark'}>
            {languages.map((lng, index) => {
              return (
                <rb.Dropdown.Item key={index} onClick={() => i18n.changeLanguage(lng.key)}>
                  {lng.description}
                </rb.Dropdown.Item>
              )
            })}
            <rb.Dropdown.Item
              href="https://github.com/joinmarket-webui/joinmarket-webui/tree/master/src/i18n/README.md"
              rel="noopener noreferrer"
            >
              Missing your language? Help us out!
            </rb.Dropdown.Item>
          </rb.Dropdown.Menu>
        </rb.Dropdown>

        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={async (e) => {
            e.preventDefault()
            setSeedError(false)
            setRevealSeed(false)
            if (!showingSeed) {
              const { name: walletName, token } = currentWallet
              const res = await Api.getWalletSeed({ walletName, token })
              if (res.ok) {
                const { seedphrase } = await res.json()
                setSeed(seedphrase)
                setShowingSeed(!showingSeed)
              } else {
                setSeedError(true)
              }
            } else {
              setShowingSeed(!showingSeed)
            }
          }}
        >
          <Sprite symbol="mnemonic" width="24" height="24" className="me-2" />
          {showingSeed ? 'Hide' : 'Show'} seed phrase
        </rb.Button>
        {seedError && (
          <div className="text-danger" style={{ marginLeft: '1rem' }}>
            Could not retreive seedphrase.
          </div>
        )}
        {showingSeed && (
          <div style={{ marginLeft: '1rem' }}>
            <div className="mb-4">
              <Seedphrase seedphrase={seed} isBlurred={!revealSeed} />
            </div>
            <div className="mb-2">
              <ToggleSwitch
                label="Reveal sensitive information"
                onToggle={(isToggled) => {
                  setRevealSeed(isToggled)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const flatSectionReducer = (state, action) => ({ ...state, [action.key]: action.value })
const withSubsectionReducer = (state, action) => ({
  ...state,
  [action.key]: Object.assign({}, state[action.key], action.value),
})

const JoinMarketSettings = () => {
  const currentWallet = useCurrentWallet()
  const [isLoading, setIsLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  const [blockchainSection, dispatchBlockchainEntry] = useReducer(flatSectionReducer, {})
  const [timeoutSection, dispatchTimeoutEntry] = useReducer(flatSectionReducer, {})
  const [policySection, dispatchPolicyEntry] = useReducer(flatSectionReducer, {})
  const [messagingSection, dispatchMessagingEntry] = useReducer(withSubsectionReducer, {})

  useEffect(() => {
    const fetchConfig = (context, section, field) =>
      Api.postConfigGet(context, { section, field })
        .then((res) =>
          res.ok ? res.json() : Promise.reject(new Error(`Could not fetch config value '[${section}]:${field}'`))
        )
        .then((json) => json.configvalue)

    const _fetchFlatConfig = (section) => (context, field) => fetchConfig(context, section, field)
    const _fetchSubsectionConfig = (subsection) => (section) => _fetchFlatConfig(`${section}:${subsection}`)

    const abortCtrl = new AbortController()

    const requestContext = {
      walletName: currentWallet.name,
      token: currentWallet.token,
      signal: abortCtrl.signal,
    }

    setIsLoading(true)

    const _fetchAndSetConfig = (fetchFn, section, dispatchFn) => (key) =>
      fetchFn(section)(requestContext, key).then((value) => dispatchFn({ key, value }))

    const fetchAndSetBlockchainConfig = _fetchAndSetConfig(_fetchFlatConfig, 'BLOCKCHAIN', dispatchBlockchainEntry)
    const fetchAndSetTimeoutConfig = _fetchAndSetConfig(_fetchFlatConfig, 'TIMEOUT', dispatchTimeoutEntry)
    const fetchAndSetPolicyConfig = _fetchAndSetConfig(_fetchFlatConfig, 'POLICY', dispatchPolicyEntry)

    const fetchAndSetMessagingConfig = (subsection, key) =>
      _fetchSubsectionConfig(subsection)(`MESSAGING`)(requestContext, key).then((value) =>
        dispatchMessagingEntry({ key: subsection, value: { [`${key}`]: value } })
      )

    const loadingBlockchain = Promise.all(
      ['blockchain_source', 'network', 'rpc_wallet_file'].map(fetchAndSetBlockchainConfig)
    )
    const loadingTimeout = Promise.all(
      ['maker_timeout_sec', 'unconfirm_timeout_sec', 'confirm_timeout_hours'].map(fetchAndSetTimeoutConfig)
    )
    const loadingPolicy = Promise.all(
      ['minimum_makers', 'max_cj_fee_abs', 'max_cj_fee_rel', 'taker_utxo_age'].map(fetchAndSetPolicyConfig)
    )

    const loadingMessaging = Promise.all(
      [
        ['server1', 'host'],
        ['server1', 'socks5'],
      ].map((keyval) => fetchAndSetMessagingConfig(keyval[0], keyval[1]))
    )

    Promise.all([loadingBlockchain, loadingTimeout, loadingPolicy, loadingMessaging])
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet])

  return (
    <div>
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading
        </div>
      ) : (
        <>
          {alert && (
            <rb.Alert className="slashed-zeroes" variant={alert.variant}>
              {alert.message}
            </rb.Alert>
          )}

          <rb.Card className="my-4">
            <rb.Card.Body>
              <rb.Card.Title className="mb-3">Blockchain</rb.Card.Title>
              <pre>{JSON.stringify(blockchainSection, null, 2)}</pre>
            </rb.Card.Body>
          </rb.Card>

          <rb.Card className="my-4">
            <rb.Card.Body>
              <rb.Card.Title className="mb-3">Messaging</rb.Card.Title>
              <pre>{JSON.stringify(messagingSection, null, 2)}</pre>
            </rb.Card.Body>
          </rb.Card>

          <rb.Card className="my-4">
            <rb.Card.Body>
              <rb.Card.Title className="mb-3">Timeout</rb.Card.Title>
              <pre>{JSON.stringify(timeoutSection, null, 2)}</pre>
            </rb.Card.Body>
          </rb.Card>

          <rb.Card className="my-4">
            <rb.Card.Body>
              <rb.Card.Title className="mb-3">Policy</rb.Card.Title>
              <pre>{JSON.stringify(policySection, null, 2)}</pre>
            </rb.Card.Body>
          </rb.Card>
        </>
      )}
    </div>
  )
}

export default function Settings() {
  const settings = useSettings()

  return (
    <div>
      <PageTitle title="Settings" />

      {!settings.useAdvancedWalletMode ? (
        <div className="mt-6">
          <JamSettings />
        </div>
      ) : (
        <rb.Tabs defaultActiveKey="jam" id="settings-tab" variant="pills" className="mb-3">
          <rb.Tab eventKey="jam" title="Jam">
            <JamSettings />
          </rb.Tab>
          <rb.Tab eventKey="joinmarket" title="JoinMarket" mountOnEnter={true} unmountOnExit={false}>
            <JoinMarketSettings />
          </rb.Tab>
        </rb.Tabs>
      )}
    </div>
  )
}
