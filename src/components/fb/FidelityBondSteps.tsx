import React, { useMemo, useCallback, useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import classnamesBind from 'classnames/bind'
import * as Api from '../../libs/JmWalletApi'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../context/SettingsContext'
import { AccountBalances, AccountBalanceSummary } from '../../context/BalanceSummary'
import { Utxo, AddressStatus, WalletInfo } from '../../context/WalletContext'
import { SelectableJar, jarInitial, jarFillLevel } from '../jars/Jar'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { CopyButton } from '../CopyButton'
import LockdateForm, { LockdateFormProps } from './LockdateForm'
import * as fb from './utils'
import styles from './FidelityBondSteps.module.css'
import { UtxoListDisplay, Divider } from '../Send/ShowUtxos'

type UtxoList = Array<Utxo>

const cx = classnamesBind.bind(styles)

type SelectDateProps = {
  description: string
} & LockdateFormProps

interface SelectJarProps {
  description: string
  accountBalances: AccountBalances
  totalBalance: Api.AmountSats
  isJarSelectable: (jarIndex: JarIndex) => boolean
  selectedJar?: JarIndex
  onJarSelected: (jarIndex: JarIndex) => void
}

interface UtxoCardProps {
  utxo: Utxo
  status?: AddressStatus
  isSelectable?: boolean
  isSelected?: boolean
  isLoading?: boolean
  onClick?: () => void
}

interface SelectUtxosProps {
  walletInfo: WalletInfo
  jar: JarIndex
  utxos: Array<Utxo>
  selectedUtxos: Array<Utxo>
  onUtxoSelected: (utxo: Utxo) => void
  onUtxoDeselected: (utxo: Utxo) => void
}

interface FreezeUtxosProps {
  walletInfo: WalletInfo
  jar: JarIndex
  utxos: Array<Utxo>
  selectedUtxos: Array<Utxo>
  isLoading?: boolean
}

interface ReviewInputsProps {
  lockDate: Api.Lockdate
  jar: JarIndex
  utxos: Array<Utxo>
  selectedUtxos: Array<Utxo>
  timelockedAddress: Api.BitcoinAddress
}

interface CreatedFidelityBondProps {
  fbUtxo: Utxo | null
  frozenUtxos: Array<Utxo>
}

const SelectDate = ({ description, yearsRange, disabled, onChange }: SelectDateProps) => {
  return (
    <div className="d-flex gap-4">
      <Sprite symbol="clock" width="24" height="24" />
      <div className="d-flex flex-column gap-4">
        <div className={styles.stepDescription}>{description}</div>
        <LockdateForm yearsRange={yearsRange} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  )
}

const SelectJar = ({
  description,
  accountBalances,
  totalBalance,
  isJarSelectable,
  selectedJar,
  onJarSelected,
}: SelectJarProps) => {
  const sortedAccountBalances: Array<AccountBalanceSummary> = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

  return (
    <div className="d-flex flex-column gap-4">
      <div className={styles.stepDescription}>{description}</div>
      <div className={styles.jarsContainer}>
        {sortedAccountBalances.map((account, index) => (
          <SelectableJar
            key={index}
            index={account.accountIndex}
            balance={account.calculatedAvailableBalanceInSats}
            frozenBalance={account.calculatedFrozenOrLockedBalanceInSats}
            isSelectable={isJarSelectable(account.accountIndex)}
            isSelected={selectedJar === account.accountIndex}
            fillLevel={jarFillLevel(account.calculatedTotalBalanceInSats, totalBalance)}
            onClick={(jarIndex) => onJarSelected(jarIndex)}
          />
        ))}
      </div>
    </div>
  )
}

const UtxoCard = ({
  utxo,
  status,
  isSelectable = true,
  isSelected = false,
  isLoading = false,
  onClick = () => {},
}: UtxoCardProps) => {
  const settings = useSettings()
  const { t } = useTranslation()

  const utxoIsLocked = useMemo(() => fb.utxo.isLocked(utxo), [utxo])

  return (
    <div
      className={cx('utxoCard', { selected: isSelected, selectable: isSelectable })}
      onClick={() => isSelectable && onClick()}
    >
      <div className={styles.utxoSelectionMarker}>
        {isSelected && <Sprite symbol="checkmark" width="18" height="18" />}
      </div>
      <div className={styles.utxoBody}>
        <Balance valueString={utxo.value.toString()} convertToUnit={settings.unit} showBalance={true} />
        <code className={styles.utxoAddress}>{utxo.address}</code>
        <div className={styles.utxoDetails}>
          <div>{utxo.path}</div>
          <div>&#183;</div>
          <div>{t('earn.fidelity_bond.select_utxos.utxo_card.confirmations', { confs: utxo.confirmations })}</div>
        </div>
      </div>
      {isLoading && (
        <div className={styles.utxoLoadingSpinner}>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
        </div>
      )}
      {!isLoading && utxo.frozen && !utxoIsLocked && (
        <div className={cx('utxoLabel', 'utxoFrozen')}>
          <Sprite symbol="snowflake" width="18" height="18" />
          <div>{t('earn.fidelity_bond.select_utxos.utxo_card.label_frozen')}</div>
        </div>
      )}
      {!isLoading && utxoIsLocked && (
        <div className={cx('utxoLabel', 'utxoFidelityBond')}>
          <Sprite symbol="timelock" width="18" height="18" />
          <div>{t('earn.fidelity_bond.select_utxos.utxo_card.label_locked')}</div>
        </div>
      )}
      {!isLoading && !utxo.frozen && status === 'cj-out' && (
        <div className={cx('utxoLabel', 'utxoCjOut')}>
          <Sprite symbol="cj" width="18" height="18" />
          <div>{t('earn.fidelity_bond.select_utxos.utxo_card.label_cj_out')}</div>
        </div>
      )}
    </div>
  )
}

const SelectUtxos = ({ walletInfo, jar, utxos, selectedUtxos, onUtxoSelected, onUtxoDeselected }: SelectUtxosProps) => {
  // const { t } = useTranslation()
  const settings = useSettings()
  // const [alert, setAlert] = useState<SimpleAlert | undefined>(undefined)
  const [showFrozenUtxos, setShowFrozenUtxos] = useState<boolean>(false)
  const [unFrozenUtxos, setUnFrozenUtxos] = useState<UtxoList>([])
  const [frozenUtxos, setFrozenUtxos] = useState<UtxoList>([])
  // const [isLoading, setisLoading] = useState<boolean>(true)

  const loadData = useCallback(() => {
    const frozen = utxos.filter((utxo: any) => utxo.frozen).map((utxo: any) => ({ ...utxo, id: utxo.utxo }))
    const unfrozen = utxos.filter((utxo: any) => !utxo.frozen).map((utxo: any) => ({ ...utxo, id: utxo.utxo }))

    setFrozenUtxos(frozen)
    setUnFrozenUtxos(unfrozen)

    // if (unfrozen.length === 0) {
    //   setAlert({ variant: 'danger', message: t('show_utxos.alert_for_empty_utxos') })
    // } else {
    //   setAlert(undefined)
    // }
  }, [utxos])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggle = (utxo: Utxo) => {
    utxos.filter((it) => it !== utxo)
    utxo.checked = !utxo.checked
    if (utxo.checked) {
      onUtxoSelected(utxo)
    } else {
      onUtxoDeselected(utxo)
    }
  }

  return (
    <>
      <div className="d-flex flex-column gap-4">
        <UtxoListDisplay utxos={unFrozenUtxos} onToggle={handleToggle} settings={settings} />
        {frozenUtxos.length > 0 && (
          <Divider
            isState={showFrozenUtxos}
            setIsState={setShowFrozenUtxos}
            className={`mt-4 ${showFrozenUtxos && 'mb-4'}`}
          />
        )}
        {showFrozenUtxos && (
          <UtxoListDisplay utxos={frozenUtxos} onToggle={handleToggle} settings={settings} showRadioAndBg={true} />
        )}
      </div>
    </>
  )
}

const FreezeUtxos = ({ walletInfo, jar, utxos, selectedUtxos, isLoading = false }: FreezeUtxosProps) => {
  const { t } = useTranslation()

  const utxosToFreeze = useMemo(() => fb.utxo.utxosToFreeze(utxos, selectedUtxos), [utxos, selectedUtxos])

  return (
    <div className="d-flex flex-column gap-2">
      <div className={styles.stepDescription}>{t('earn.fidelity_bond.freeze_utxos.description_selected_utxos')}</div>
      {selectedUtxos.map((utxo, index) => (
        <UtxoCard
          key={index}
          utxo={utxo}
          status={walletInfo.addressSummary[utxo.address]?.status}
          isSelectable={false}
          isSelected={true}
        />
      ))}
      {utxosToFreeze.length > 0 && (
        <>
          {fb.utxo.allAreFrozen(utxosToFreeze) ? (
            <div className={`mt-2 ${styles.stepDescription}`}>
              {t('earn.fidelity_bond.freeze_utxos.description_unselected_utxos')}
            </div>
          ) : (
            <div className={`mt-2 ${styles.stepDescription}`}>
              {t('earn.fidelity_bond.freeze_utxos.description_unselected_utxos')}{' '}
              {t('earn.fidelity_bond.freeze_utxos.description_selected_utxos_to_freeze', { jar: jarInitial(jar) })}
            </div>
          )}
          {utxosToFreeze.map((utxo, index) => (
            <UtxoCard
              key={index}
              utxo={utxo}
              status={walletInfo.addressSummary[utxo.address]?.status}
              isSelectable={false}
              isSelected={false}
              isLoading={isLoading}
            />
          ))}
        </>
      )}
    </div>
  )
}

const UtxoSummary = ({ title, icon, utxos }: { title: string; icon: React.ReactElement; utxos: Array<Utxo> }) => {
  const settings = useSettings()

  return (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex align-items-center gap-1">
        {icon}
        <div className={styles.utxoSummaryTitle}>{title}</div>
      </div>
      <div className="d-flex flex-wrap gap-1">
        {utxos.map((utxo, index) => (
          <div className={styles.utxoSummaryCard} key={index}>
            <div className={styles.utxoSummaryCardTitleContainer}>
              <div className={styles.utxoSummaryCardTitle}>
                <Balance valueString={utxo.value.toString()} convertToUnit={settings.unit} showBalance={true} />
              </div>
              {utxo.label === 'cj-out' && (
                <div className={cx('utxoSummaryCardTitleLabel', 'utxoCjOut')}>
                  <Sprite symbol="cj" width="9" height="9" />
                  {utxo.label}
                </div>
              )}
            </div>
            <div className={styles.utxoSummaryCardSubtitle}>
              <code>{utxo.address}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ReviewInputs = ({ lockDate, jar, utxos, selectedUtxos, timelockedAddress }: ReviewInputsProps) => {
  const settings = useSettings()
  const { t, i18n } = useTranslation()

  const confirmationItems = [
    {
      icon: <Sprite symbol="clock" width="18" height="18" className={styles.confirmationStepIcon} />,
      label: t('earn.fidelity_bond.review_inputs.label_lock_date'),
      content: (
        <>
          {new Date(fb.lockdate.toTimestamp(lockDate)).toUTCString()} (
          {fb.time.humanReadableDuration({
            to: fb.lockdate.toTimestamp(lockDate),
            locale: i18n.resolvedLanguage || i18n.language,
          })}
          )
        </>
      ),
    },
    {
      icon: <Sprite symbol="jar-open-fill-50" width="18" height="18" className={styles.confirmationStepIcon} />,
      label: t('earn.fidelity_bond.review_inputs.label_jar'),
      content: t('earn.fidelity_bond.review_inputs.label_jar_n', { jar: jarInitial(jar) }),
    },
    {
      icon: <Sprite symbol="coins" width="18" height="18" className={styles.confirmationStepIcon} />,
      label: t('earn.fidelity_bond.review_inputs.label_amount'),
      content: (
        <Balance
          valueString={selectedUtxos.reduce((acc: number, utxo: Utxo) => acc + utxo.value, 0).toString()}
          convertToUnit={settings.unit}
          showBalance={true}
        />
      ),
    },
    {
      icon: (
        <CopyButton
          text={<Sprite symbol="copy" width="18" height="18" />}
          successText={<Sprite symbol="checkmark" width="18" height="18" />}
          value={timelockedAddress}
          className={styles.confirmationStepIcon}
        />
      ),
      label: t('earn.fidelity_bond.review_inputs.label_address'),
      content: <code className={styles.timelockedAddress}>{timelockedAddress}</code>,
    },
  ]

  return (
    <div className="d-flex flex-column gap-4">
      <div className={styles.stepDescription}>{t('earn.fidelity_bond.review_inputs.description')}</div>
      <div className="d-flex gap-5 px-4 align-items-center">
        <Sprite symbol="fb-filled" width="60" height="110" className={styles.fbIcon} />
        <div className="d-flex flex-column gap-3">
          {confirmationItems.map((item, index) => (
            <div className="d-flex align-items-center gap-2" key={index}>
              {item.icon}
              <div className="d-flex flex-column">
                <div className={styles.confirmationStepLabel}>{item.label}</div>
                <div className={styles.confirmationStepContent}>{item.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <hr className="my-0" />
      <UtxoSummary
        title={t('earn.fidelity_bond.review_inputs.label_selected_utxos')}
        icon={<Sprite symbol="timelock" width="18" height="18" className={styles.utxoSummaryIconLock} />}
        utxos={selectedUtxos}
      />
    </div>
  )
}

const CreatedFidelityBond = ({ fbUtxo, frozenUtxos }: CreatedFidelityBondProps) => {
  const { t, i18n } = useTranslation()

  const humanReadableLockDuration = useMemo(() => {
    if (!fbUtxo) return '-'

    const locktime = fb.utxo.getLocktime(fbUtxo)
    if (!locktime) return '-'
    return fb.time.humanReadableDuration({
      to: locktime,
      locale: i18n.resolvedLanguage || i18n.language,
    })
  }, [i18n, fbUtxo])

  return (
    <div className="d-flex flex-column gap-3">
      <Done text={t('earn.fidelity_bond.create_fidelity_bond.success_text')} />

      <div className="d-flex flex-column align-items-start gap-4">
        {fbUtxo !== null && (
          <div className="d-flex flex-column gap-1 mt-2">
            <div className="d-flex align-items-center gap-2">
              <Sprite symbol="clock" width="18" height="18" className={styles.confirmationStepIcon} />
              <div className="d-flex flex-column">
                <div className={styles.confirmationStepLabel}>
                  {t('earn.fidelity_bond.create_fidelity_bond.label_lock_date')}
                </div>
                {fbUtxo.locktime && (
                  <div className={styles.confirmationStepContent}>
                    {fbUtxo.locktime} ({humanReadableLockDuration})
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <CopyButton
                text={<Sprite symbol="copy" width="18" height="18" />}
                successText={<Sprite symbol="checkmark" width="18" height="18" />}
                value={fbUtxo.address}
                className={styles.confirmationStepIcon}
              />
              <div className="d-flex flex-column">
                <div className={styles.confirmationStepLabel}>
                  {t('earn.fidelity_bond.create_fidelity_bond.label_address')}
                </div>
                <div className={styles.confirmationStepContent}>
                  <code className={styles.timelockedAddress}>{fbUtxo.address}</code>
                </div>
              </div>
            </div>
          </div>
        )}
        {frozenUtxos.length > 0 && (
          <>
            <hr className="my-0 w-100" />
            <UtxoSummary
              title={t('earn.fidelity_bond.create_fidelity_bond.label_utxos_to_unfreeze')}
              icon={<Sprite symbol="sun" width="18" height="18" />}
              utxos={frozenUtxos}
            />
          </>
        )}
      </div>
    </div>
  )
}

const Done = ({ text }: { text: string }) => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center gap-1">
      <div className={styles.createdCheckmark}>
        <Sprite symbol="checkmark" width="24" height="30" />
      </div>
      <div className={styles.createdSummaryTitle}>{text}</div>
    </div>
  )
}

export { SelectJar, SelectUtxos, SelectDate, FreezeUtxos, ReviewInputs, CreatedFidelityBond, Done }
