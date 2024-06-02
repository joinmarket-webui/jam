import { useState, useMemo } from 'react'
import { useField, useFormikContext } from 'formik'
import * as rb from 'react-bootstrap'
import { jarFillLevel, SelectableSendJar } from '../jars/Jar'
import { noop } from '../../utils'
import { WalletInfo, CurrentWallet } from '../../context/WalletContext'
import styles from './SourceJarSelector.module.css'
import ShowUtxos from './ShowUtxos'

export type SourceJarSelectorProps = {
  name: string
  label: string
  className?: string
  variant: 'default' | 'warning'
  walletInfo?: WalletInfo
  wallet: CurrentWallet
  isLoading: boolean
  disabled?: boolean
}

interface showingUtxosProps {
  index: String
  show: boolean
}

export const SourceJarSelector = ({
  name,
  label,
  walletInfo,
  wallet,
  variant,
  isLoading,
  disabled = false,
}: SourceJarSelectorProps) => {
  const [field] = useField<JarIndex>(name)
  const form = useFormikContext<any>()
  const [showingUTXOS, setshowingUTXOS] = useState<showingUtxosProps>({
    index: '',
    show: false,
  })

  const jarBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  return (
    <>
      <rb.Form.Group className="mb-4 flex-grow-1" controlId={field.name}>
        <rb.Form.Label>{label}</rb.Form.Label>
        {!walletInfo || jarBalances.length === 0 ? (
          <rb.Placeholder as="div" animation="wave">
            <rb.Placeholder className={styles.sourceJarsPlaceholder} />
          </rb.Placeholder>
        ) : (
          <div className={styles.sourceJarsContainer}>
            {showingUTXOS.show && (
              <ShowUtxos
                walletInfo={walletInfo}
                wallet={wallet}
                show={showingUTXOS.show}
                onHide={() => {
                  setshowingUTXOS({
                    index: '',
                    show: false,
                  })
                }}
                index={showingUTXOS.index}
              />
            )}
            {jarBalances.map((it) => {
              return (
                <div key={it.accountIndex}>
                  <SelectableSendJar
                    tooltipText={'Select UTXOs'}
                    index={it.accountIndex}
                    balance={it.calculatedAvailableBalanceInSats}
                    frozenBalance={it.calculatedFrozenOrLockedBalanceInSats}
                    isSelectable={!disabled && !isLoading && it.calculatedTotalBalanceInSats > 0}
                    isSelected={it.accountIndex === field.value}
                    fillLevel={jarFillLevel(
                      it.calculatedTotalBalanceInSats,
                      walletInfo.balanceSummary.calculatedTotalBalanceInSats,
                    )}
                    variant={it.accountIndex === field.value ? variant : undefined}
                    onClick={(jarIndex) => {
                      form.setFieldValue(field.name, jarIndex, true)
                      setshowingUTXOS({
                        index: jarIndex.toString(),
                        show: true,
                      })
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

        <rb.Form.Control
          type="number"
          name={field.name}
          value={field.value || ''}
          onChange={noop}
          isInvalid={!!form.errors[field.name]}
          readOnly={true}
          required
          hidden={true}
        />
        <rb.Form.Control.Feedback type="invalid">
          <>{form.errors[field.name]}</>
        </rb.Form.Control.Feedback>
      </rb.Form.Group>
    </>
  )
}
