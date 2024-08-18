import { useMemo, useState, useEffect } from 'react'
import * as Api from '../../libs/JmWalletApi'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../context/SettingsContext'
import { AccountBalances, AccountBalanceSummary } from '../../context/BalanceSummary'
import { Utxo, WalletInfo } from '../../context/WalletContext'
import { SelectableJar, jarFillLevel } from '../jars/Jar'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { CopyButton } from '../CopyButton'
import LockdateForm, { LockdateFormProps } from './LockdateForm'
import * as fb from './utils'
import styles from './FidelityBondSteps.module.css'
import { UtxoListDisplay, Divider } from '../Send/ShowUtxos'

type UtxoList = Array<Utxo>

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

interface SelectUtxosProps {
  walletInfo: WalletInfo
  jar: JarIndex
  utxos: Utxo[]
  selectedUtxos: Utxo[]
  onUtxoSelected: (utxo: Utxo) => void
  onUtxoDeselected: (utxo: Utxo) => void
}

interface ConfirmationProps {
  lockDate: Api.Lockdate
  jar: JarIndex
  selectedUtxos: Utxo[]
  timelockedAddress: Api.BitcoinAddress
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

const SelectUtxos = ({ selectedUtxos, utxos, onUtxoSelected, onUtxoDeselected }: SelectUtxosProps) => {
  const settings = useSettings()
  // const [alert, setAlert] = useState<SimpleAlert | undefined>(undefined)
  const [showFrozenUtxos, setShowFrozenUtxos] = useState<boolean>(false)
  const [unFrozenUtxos, setUnFrozenUtxos] = useState<UtxoList>([])
  const [frozenUtxos, setFrozenUtxos] = useState<UtxoList>([])
  // const [isLoading, setisLoading] = useState<boolean>(true)

  const frozenNonTimelockedUtxos = utxos
    .filter((it) => it.frozen)
    .filter((it) => !it.locktime)
    .map((it) =>
      fb.utxo.isInList(it, selectedUtxos)
        ? {
            ...it,
            checked: true,
            selectable: true,
          }
        : {
            ...it,
            checked: false,
            selectable: true,
          },
    )
    .sort((a, b) => a.confirmations - b.confirmations)

  const timelockedUtxos = utxos
    .filter((it) => it.locktime !== undefined)
    .map((it) => ({ ...it, checked: false, selectable: false }))
    .sort((a, b) => a.confirmations - b.confirmations)

  const lowerUtxos = [...frozenNonTimelockedUtxos, ...timelockedUtxos]

  const [showFrozenUtxos, setShowFrozenUtxos] = useState(upperUtxos.length === 0 && lowerUtxos.length > 0)

  const handleToggle = (utxoIndex: number, utxo: Utxo) => {
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
        <UtxoListDisplay
          utxos={unFrozenUtxos}
          onToggle={handleToggle}
          settings={settings}
          showRadioButton={true}
          showBackgroundColor={true}
        />
        {frozenUtxos.length > 0 && (
          <Divider
            isState={showFrozenUtxos}
            setIsState={setShowFrozenUtxos}
            className={`mt-4 ${showFrozenUtxos && 'mb-4'}`}
          />
        )}
        {showFrozenUtxos && (
          <UtxoListDisplay
            utxos={frozenUtxos}
            onToggle={handleToggle}
            settings={settings}
            showRadioButton={true}
            showBackgroundColor={true}
          />
        )}
      </div>
    </>
  )
}

const Confirmation = ({ lockDate, jar, selectedUtxos, timelockedAddress }: ConfirmationProps) => {
  useEffect(() => {
    console.log('lockDate', lockDate)
    console.log('jar', jar)
    console.log('selected', selectedUtxos)
  }, [jar, lockDate, selectedUtxos])

  const settings = useSettings()
  const { t, i18n } = useTranslation()

  const confirmationItems = [
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
    <>
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
    </>
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

export { SelectJar, SelectUtxos, SelectDate, Done, Confirmation }
