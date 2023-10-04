import { useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik } from 'formik'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import { walletDisplayName } from '../utils'
import { WalletFileName } from '../libs/JmWalletApi'

export type WalletInfo = {
  walletFileName: WalletFileName
  password: string
  seedphrase: string
}

interface WalletCreationInfoSummaryProps {
  walletInfo: WalletInfo
  revealSensitiveInfo: boolean
}

export const WalletInfoSummary = ({ walletInfo, revealSensitiveInfo }: WalletCreationInfoSummaryProps) => {
  const { t } = useTranslation()
  return (
    <>
      <div className="mb-4">
        <div>{t('create_wallet.confirmation_label_wallet_name')}</div>
        <div className="fs-4">{walletDisplayName(walletInfo.walletFileName)}</div>
      </div>
      <div className="mb-4">
        <Seedphrase seedphrase={walletInfo.seedphrase} isBlurred={!revealSensitiveInfo} />
      </div>
      <div className="mb-4">
        <div>{t('create_wallet.confirmation_label_password')}</div>
        <div className={`fs-4${revealSensitiveInfo ? '' : ' blurred-text'}`}>
          {!revealSensitiveInfo ? 'randomrandom' : walletInfo.password}
        </div>
      </div>
    </>
  )
}

interface WalletCreationConfirmationProps {
  wallet: WalletInfo
  submitButtonText: (isSubmitting: boolean) => React.ReactNode | string
  onSubmit: () => Promise<void>
}

const WalletCreationConfirmation = ({ wallet, submitButtonText, onSubmit }: WalletCreationConfirmationProps) => {
  const { t } = useTranslation()
  const [userConfirmed, setUserConfirmed] = useState(false)
  const [revealSensitiveInfo, setRevealSensitiveInfo] = useState(false)
  const [sensitiveInfoWasRevealed, setSensitiveInfoWasRevealed] = useState(false)

  return (
    <Formik
      initialValues={{}}
      validate={() => ({})}
      onSubmit={async (_: any) => {
        if (!sensitiveInfoWasRevealed || !userConfirmed) return
        await onSubmit()
      }}
    >
      {({ handleSubmit, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate>
          <WalletInfoSummary walletInfo={wallet} revealSensitiveInfo={revealSensitiveInfo} />
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
            className="w-100 mb-4"
            variant="dark"
            size="lg"
            type="submit"
            disabled={!sensitiveInfoWasRevealed || !userConfirmed || isSubmitting}
          >
            <div className="d-flex justify-content-center align-items-center">
              {isSubmitting && (
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              )}
              {submitButtonText(isSubmitting)}
            </div>
          </rb.Button>
        </rb.Form>
      )}
    </Formik>
  )
}

export default WalletCreationConfirmation
