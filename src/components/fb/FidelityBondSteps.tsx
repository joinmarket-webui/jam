import React, { useMemo } from 'react'
import * as rb from 'react-bootstrap'
import classnamesBind from 'classnames/bind'
import * as Api from '../../libs/JmWalletApi'
import { useSettings } from '../../context/SettingsContext'
import { AccountBalances, AccountBalanceSummary } from '../../hooks/BalanceSummary'
import { Utxo } from '../../context/WalletContext'
import { calculateFillLevel, SelectableJar } from '../jars/Jar'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { CopyButton } from '../CopyButton'
import LockdateForm from './LockdateForm'
import * as fb from './utils'
import styles from './FidelityBondSteps.module.css'

const cx = classnamesBind.bind(styles)

interface SelectDateProps {
  selectableYearsRange: fb.YearsRange
  onDateSelected: (lockdate: Api.Lockdate | null) => void
}

interface SelectJarProps {
  accountBalances: AccountBalances
  totalBalance: number
  utxos: { [accountIndex: number]: Array<Utxo> }
  selectedJar: number | null
  onJarSelected: (accountIndex: number) => void
}

interface UtxoCardProps {
  utxo: Utxo
  isSelectable?: boolean
  isSelected?: boolean
  isLoading?: boolean
  onClick?: () => void
}

interface SelectUtxosProps {
  jar: number
  utxos: Array<Utxo>
  selectedUtxos: Array<Utxo>
  onUtxoSelected: (utxo: Utxo) => void
  onUtxoDeselected: (utxo: Utxo) => void
}

interface FreezeUtxosProps {
  jar: number
  utxos: Array<Utxo>
  selectedUtxos: Array<Utxo>
  isLoading?: boolean
}

interface ReviewInputsProps {
  lockDate: Api.Lockdate
  jar: number
  utxos: Array<Utxo>
  selectedUtxos: Array<Utxo>
  timelockedAddress: string
}

const SelectDate = ({ selectableYearsRange, onDateSelected }: SelectDateProps) => {
  return (
    <div className="d-flex flex-column gap-4">
      <div className={styles.stepDescription}>
        Fidelity bonds are a feature of JoinMarket which improves the resistance to sybil attacks, and therefore
        improves the privacy of the system. This should be a better and easier to understand description and let the
        user know that they should pick a date until which the fidelity bond will be valid. Maybe also a recommendation
        on the length.
      </div>
      <LockdateForm onChange={(date) => onDateSelected(date)} yearsRange={selectableYearsRange} />
    </div>
  )
}

const SelectJar = ({ accountBalances, totalBalance, utxos, selectedJar, onJarSelected }: SelectJarProps) => {
  const sortedAccountBalances: Array<AccountBalanceSummary> = useMemo(() => {
    if (!accountBalances) return []
    return Object.values(accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [accountBalances])

  return (
    <div className="d-flex flex-column gap-4">
      <div className={styles.stepDescription}>Select a jar to fund the fidelity bond from.</div>
      <div className="d-flex justify-content-between">
        {sortedAccountBalances.map((account, index) => (
          <SelectableJar
            key={index}
            index={account.accountIndex}
            balance={account.totalBalance}
            isSelectable={utxos[account.accountIndex] && utxos[account.accountIndex].length > 0}
            isSelected={selectedJar === account.accountIndex}
            fillLevel={calculateFillLevel(Number.parseFloat(account.totalBalance), totalBalance)}
            onClick={() => onJarSelected(account.accountIndex)}
          />
        ))}
      </div>
    </div>
  )
}

const UtxoCard = ({
  utxo,
  isSelectable = true,
  isSelected = false,
  isLoading = false,
  onClick = () => {},
}: UtxoCardProps) => {
  const settings = useSettings()

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
          <div>{utxo.confirmations} Confirmations</div>
        </div>
      </div>
      {isLoading && (
        <div className={styles.utxoLoadingSpinner}>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
        </div>
      )}
      {!isLoading && utxo.frozen && !utxo.locktime && (
        <div className={cx('utxoLabel', 'utxoFrozen')}>
          <Sprite symbol="snowflake" width="18" height="18" />
          <div>frozen</div>
        </div>
      )}
      {!isLoading && utxo.locktime && (
        <div className={cx('utxoLabel', 'utxoFidelityBond')}>
          <Sprite symbol="lock" width="18" height="18" />
          <div>locked</div>
        </div>
      )}
      {!isLoading && !utxo.frozen && utxo.label === 'cj-out' && (
        <div className={cx('utxoLabel', 'utxoCjOut')}>
          <Sprite symbol="cj" width="18" height="18" />
          <div>cj-out</div>
        </div>
      )}
    </div>
  )
}

const SelectUtxos = ({ jar, utxos, selectedUtxos, onUtxoSelected, onUtxoDeselected }: SelectUtxosProps) => {
  return (
    <div className="d-flex flex-column gap-4">
      <div className={styles.stepDescription}>
        Select one or more UTXOs from jar #{jar} to use for the fidelity bond.
      </div>
      {utxos.map((utxo, index) => (
        <UtxoCard
          key={index}
          utxo={utxo}
          isSelectable={!utxo.frozen}
          isSelected={fb.utxo.isInList(utxo, selectedUtxos)}
          onClick={() => {
            if (fb.utxo.isInList(utxo, selectedUtxos)) {
              onUtxoDeselected(utxo)
            } else {
              onUtxoSelected(utxo)
            }
          }}
        />
      ))}
    </div>
  )
}

const FreezeUtxos = ({ jar, utxos, selectedUtxos, isLoading = false }: FreezeUtxosProps) => {
  return (
    <div className="d-flex flex-column gap-4">
      <div className={styles.stepDescription}>Selected UTXOs:</div>
      {selectedUtxos.map((utxo, index) => (
        <UtxoCard key={index} utxo={utxo} isSelectable={false} isSelected={true} />
      ))}
      <div className={styles.stepDescription}>
        The following UTXOs will not be used for the fidelity bond. They will be frozen in order to remain in jar #{jar}
        . You can unfreeze them anytime after creating the fidelity bond.
      </div>
      {fb.utxo.utxosToFreeze(utxos, selectedUtxos).map((utxo, index) => (
        <UtxoCard key={index} utxo={utxo} isSelectable={false} isSelected={false} isLoading={isLoading} />
      ))}
    </div>
  )
}

const ReviewInputs = ({ lockDate, jar, utxos, selectedUtxos, timelockedAddress }: ReviewInputsProps) => {
  const settings = useSettings()

  const UtxoSummary = ({ title, icon, utxos }: { title: string; icon: string; utxos: Array<Utxo> }) => (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex align-items-center gap-1">
        <Sprite symbol={icon} width="18" height="18" className={styles.utxoSummaryIcon} />
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

  const confirmationItems = [
    {
      icon: <Sprite symbol="clock" width="18" height="18" className={styles.confirmationStepIcon} />,
      label: 'Locked until',
      content: <>{new Date(lockDate).toUTCString()}</>,
    },
    {
      icon: <Sprite symbol="jar-open-fill-50" width="18" height="18" className={styles.confirmationStepIcon} />,
      label: 'Funds will be spent from',
      content: `Jar #${jar}`,
    },
    {
      icon: <Sprite symbol="coins" width="18" height="18" className={styles.confirmationStepIcon} />,
      label: 'Amount to be locked up',
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
          showSprites={false}
          text={<Sprite symbol="copy" width="18" height="18" />}
          successText={<Sprite symbol="checkmark" width="18" height="18" />}
          value={timelockedAddress}
          className={styles.confirmationStepIcon}
        />
      ),
      label: 'Funds will be locked up on this address',
      content: <code className={styles.timelockedAddress}>{timelockedAddress}</code>,
    },
  ]

  return (
    <div className="d-flex flex-column gap-4">
      <div className={styles.stepDescription}>You configured the fidelity bond as follows.</div>
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
      <UtxoSummary title={'UTXOs that will be locked up'} icon="lock" utxos={selectedUtxos} />
    </div>
  )
}

export { SelectJar, SelectUtxos, SelectDate, FreezeUtxos, ReviewInputs }
