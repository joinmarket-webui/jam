import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../context/SettingsContext'
import { Utxo } from '../../context/WalletContext'
import Balance from '../Balance'
import Sprite from '../Sprite'
import styles from './UtxoDetailModule.module.css'

interface UtxoDetailModalProps {
  utxo: Utxo
  status: string | null
  isShown: boolean
  close: () => void
}

const UtxoDetailModal = ({ utxo, status, isShown, close }: UtxoDetailModalProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  return (
    <rb.Modal
      show={isShown}
      keyboard={true}
      onEscapeKeyDown={close}
      onHide={close}
      centered={true}
      animation={true}
      className={styles.utxoDetailModal}
      backdropClassName={styles.utxoDetailModalBackdrop}
    >
      <rb.Modal.Header className={styles.modalHeader}>
        <rb.Modal.Title className={styles.modalTitle}>
          <div>
            <div>
              <Balance
                valueString={utxo.value.toString()}
                convertToUnit={settings.unit}
                showBalance={settings.showBalance}
              />
            </div>
            <rb.Button onClick={close} className={styles.cancelButton}>
              <Sprite symbol="cancel" width="26" height="26" />
            </rb.Button>
          </div>
        </rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        <div className="d-flex flex-column gap-3">
          <div>
            <strong>{t('jar_details.utxo_list.utxo_detail_label_id')}</strong>: <code>{utxo.utxo}</code>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_address')}</strong>: <code>{utxo.address}</code>
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_path')}</strong>: <code>{utxo.path}</code>
            </div>
            {utxo.label && (
              <div>
                <strong>{t('jar_details.utxo_list.utxo_detail_label_label')}</strong>: {utxo.label}
              </div>
            )}
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_value')}</strong>:{' '}
              <Balance
                valueString={utxo.value.toString()}
                convertToUnit={settings.unit}
                showBalance={settings.showBalance}
              />
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_tries')}</strong>: {utxo.tries}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_tries_remaining')}</strong>: {utxo.tries_remaining}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_is_external')}</strong>:{' '}
              {utxo.external ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_jar')}</strong>: {utxo.mixdepth}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_confirmations')}</strong>: {utxo.confirmations}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_is_frozen')}</strong>: {utxo.frozen ? 'Yes' : 'No'}
            </div>
            {utxo.locktime && (
              <div>
                <strong>{t('jar_details.utxo_list.utxo_detail_label_locktime')}</strong>: {utxo.locktime}
              </div>
            )}
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_status')}</strong>: {status}
            </div>
          </div>
        </div>
      </rb.Modal.Body>
      <rb.Modal.Footer className="d-flex justify-content-center">
        <rb.Button variant="light" onClick={close} className="w-25 d-flex justify-content-center align-items-center">
          <span>{t('global.close')}</span>
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}

export default UtxoDetailModal
