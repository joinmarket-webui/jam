import { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Seedphrase from '../Seedphrase'
import ToggleSwitch from '../ToggleSwitch'
import { CurrentWallet } from '../../context/WalletContext'
import * as Api from '../../libs/JmWalletApi'

interface SeedModalProps {
  wallet: CurrentWallet
  show: boolean
  onHide: () => void
}

export default function SeedModal({ wallet, show, onHide }: SeedModalProps) {
  const { t } = useTranslation()

  const [revealSeed, setRevealSeed] = useState(false)
  const [seedError, setSeedError] = useState(false)
  const [seed, setSeed] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSeedTimeout, setShowSeedTimeout] = useState<NodeJS.Timeout | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    const loadSeed = async () => {
      setIsLoading(true)
      try {
        const res = await Api.getWalletSeed(wallet)
        const { seedphrase } = await (res.ok ? res.json() : Api.Helper.throwError(res))

        setIsLoading(false)
        setSeed(seedphrase)
      } catch (e) {
        setIsLoading(false)
        setSeedError(true)
      }
    }

    if (show) {
      loadSeed()
    }

    return () => {
      // Reset state when modal is closed
      setRevealSeed(false)
      setPassword('')
      setPasswordError('')
      setIsAuthenticated(false)
      setTimeLeft(30)
      if (showSeedTimeout) {
        clearTimeout(showSeedTimeout)
      }
    }
  }, [show, wallet])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (revealSeed && isAuthenticated) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer!)
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [revealSeed, isAuthenticated])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setPasswordError('')

    try {
      // Verify password by attempting to unlock wallet
      const res = await Api.postWalletUnlock({ walletFileName: wallet.walletFileName }, { password })
      if (res.ok) {
        setIsAuthenticated(true)
        setRevealSeed(true)
        setTimeLeft(30)

        // Auto-hide seed after 30 seconds
        const timeout = setTimeout(() => {
          setRevealSeed(false)
          setIsAuthenticated(false)
          setTimeLeft(30)
        }, 30000)
        setShowSeedTimeout(timeout)
      } else {
        setPasswordError(t('settings.error_invalid_password'))
      }
    } catch (e) {
      setPasswordError(t('settings.error_authentication_failed'))
    }
    setIsAuthenticating(false)
  }

  return (
    <rb.Modal size="lg" show={show} onHide={onHide} keyboard={false} centered={true} animation={true}>
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{wallet.displayName}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        <>
          {isLoading && (
            <div className="d-flex justify-content-center align-items-center">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            </div>
          )}
          {seedError && (
            <div className="text-danger" style={{ marginLeft: '1rem' }}>
              {t('settings.error_loading_seed_failed')}
            </div>
          )}
          {seed && !isAuthenticated && (
            <rb.Form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">{t('settings.seed_auth_info_text')}</div>
              <rb.Form.Group className="mb-3">
                <rb.Form.Label>{t('settings.password_label')}</rb.Form.Label>
                <rb.Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isInvalid={!!passwordError}
                  disabled={isAuthenticating}
                  required
                />
                <rb.Form.Control.Feedback type="invalid">{passwordError}</rb.Form.Control.Feedback>
              </rb.Form.Group>
              <div className="d-flex justify-content-center">
                <rb.Button type="submit" variant="primary" disabled={isAuthenticating}>
                  {isAuthenticating ? (
                    <>
                      <rb.Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      {t('settings.authenticating')}
                    </>
                  ) : (
                    t('settings.reveal_seed')
                  )}
                </rb.Button>
              </div>
            </rb.Form>
          )}
          {seed && isAuthenticated && (
            <>
              <div className="mb-4">
                {t('settings.seed_modal_info_text')}
                <div className="text-warning mt-2 d-flex align-items-center justify-content-center">
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {t('settings.seed_auto_hide_warning')} ({timeLeft}s)
                </div>
              </div>
              <rb.Row className="justify-content-center align-items-center">
                <rb.Col xs={12} md={10} className="mb-4">
                  <Seedphrase seedphrase={seed} centered={true} isBlurred={!revealSeed} />
                </rb.Col>
              </rb.Row>
            </>
          )}
        </>
      </rb.Modal.Body>
    </rb.Modal>
  )
}
