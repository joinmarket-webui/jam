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
  const [seed, setSeed] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSeed = async () => {
      setIsLoading(true)
      try {
        const { seedphrase } = await Api.getWalletSeed(wallet)
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
                  <ToggleSwitch
                    label={t('settings.reveal_seed')}
                    toggledOn={revealSeed}
                    onToggle={(isToggled) => setRevealSeed(isToggled)}
                  />
                </div>
              </div>
            </>
          )}
        </>
      </rb.Modal.Body>
    </rb.Modal>
  )
}
