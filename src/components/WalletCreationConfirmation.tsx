import { useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import PreventLeavingPageByMistake from './PreventLeavingPageByMistake'
import { walletDisplayName } from '../utils'
// TODO: currently reusing CreateWallet styles - mvoe to own module.css?
import styles from './CreateWallet.module.css'

interface WalletCreationConfirmationProps {
  wallet: { walletFileName: string; password: string; seedphrase: string }
  onSubmit: () => void
}

const WalletCreationConfirmation = ({ wallet, onSubmit }: WalletCreationConfirmationProps) => {
  const { t } = useTranslation()
  const [userConfirmed, setUserConfirmed] = useState(false)
  const [revealSensitiveInfo, setRevealSensitiveInfo] = useState(false)
  const [sensitiveInfoWasRevealed, setSensitiveInfoWasRevealed] = useState(false)

  return (
    <>
      <PreventLeavingPageByMistake />
      <div>
        <div className="mb-4">
          <div>{t('create_wallet.confirmation_label_wallet_name')}</div>
          <div className="fs-4">{walletDisplayName(wallet.walletFileName)}</div>
        </div>
        <div className="mb-4">
          <Seedphrase seedphrase={wallet.seedphrase} isBlurred={!revealSensitiveInfo} />
        </div>
        <div className="mb-4">
          <div>{t('create_wallet.confirmation_label_password')}</div>
          <div className={`fs-4${revealSensitiveInfo ? '' : ' blurred-text'}`}>
            {!revealSensitiveInfo ? 'randomrandom' : wallet.password}
          </div>
        </div>
        <div className="mb-2">
          <ToggleSwitch
            label={t('create_wallet.confirmation_toggle_reveal_info')}
            toggledOn={revealSensitiveInfo}
            onToggle={(isToggled) => {
              setRevealSensitiveInfo(isToggled)
              setSensitiveInfoWasRevealed(true)
            }}
          />
        </div>
        <div className="mb-4">
          <ToggleSwitch
            label={t('create_wallet.confirmation_toggle_info_written_down')}
            toggledOn={userConfirmed}
            onToggle={(isToggled) => setUserConfirmed(isToggled)}
          />
        </div>
        <rb.Button
          variant="dark"
          disabled={!sensitiveInfoWasRevealed || !userConfirmed}
          className={styles.button}
          onClick={() => onSubmit()}
        >
          {t('create_wallet.next_button')}
        </rb.Button>
      </div>
    </>
  )
}

export default WalletCreationConfirmation
