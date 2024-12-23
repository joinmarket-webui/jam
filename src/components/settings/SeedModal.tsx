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
  const [showPopup, setShowPopup] = useState(false)
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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
  }, [show, wallet])

  const handleToggle = (isToggled: boolean) => {
    if (isToggled) {
      setShowPopup(true)
      setErrorMessage('')
    } else {
      setRevealSeed(false)
    }
  }

  const handlePopupClose = () => {
    setShowPopup(false)
    setRevealSeed(false)
    setErrorMessage('')
    setPassword('')
  }

  const handlePopupEnter = async () => {
    setErrorMessage('')

    if (!password) {
      setErrorMessage(t('settings.password_required'))
      return
    }

    try {
      const res = await Api.postWalletUnlock({ walletFileName: wallet.walletFileName }, { password })
      if (!res.ok) {
        setErrorMessage(t('settings.error_invalid_password'))
        return
      }

      setShowPopup(false)
      setRevealSeed(true)
      setPassword('')
    } catch (error) {
      setErrorMessage(t('settings.error_validating_password'))
    }
  }

  return (
    <>
      <rb.Modal size="lg" show={show} onHide={onHide} keyboard={false} centered>
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
            {seed && (
              <>
                <div className="mb-4">{t('settings.seed_modal_info_text')}</div>
                <rb.Row className="justify-content-center align-items-center">
                  <rb.Col xs={12} md={10} className="mb-4">
                    <Seedphrase seedphrase={seed} centered={true} isBlurred={!revealSeed} />
                  </rb.Col>
                </rb.Row>
                <div className="d-flex justify-content-center align-items-center">
                  <div className="mb-2">
                    <ToggleSwitch label={t('settings.reveal_seed')} toggledOn={revealSeed} onToggle={handleToggle} />
                  </div>
                </div>
              </>
            )}
          </>
        </rb.Modal.Body>
      </rb.Modal>

      <rb.Modal show={showPopup} onHide={handlePopupClose} centered dialogClassName="password-verify-modal">
        <rb.Modal.Header closeButton>
          <rb.Modal.Title className="text-center w-100">{t('settings.verify_password')}</rb.Modal.Title>
        </rb.Modal.Header>
        <rb.Modal.Body>
          <div className="text-center">
            <rb.Form.Control
              type="password"
              placeholder={t('settings.enter_password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-1 text-center"
              isInvalid={!!errorMessage}
            />
            {errorMessage && <small className="text-danger d-block mt-2">{errorMessage}</small>}
          </div>
        </rb.Modal.Body>
        <rb.Modal.Footer className="d-flex justify-content-center">
          <rb.Button variant="dark" onClick={handlePopupEnter}>
            {t('settings.confirm')}
          </rb.Button>
        </rb.Modal.Footer>
      </rb.Modal>

      <style>
        {`
          .password-verify-modal {
            max-width: 400px !important;
          }
        `}
      </style>
    </>
  )
}
