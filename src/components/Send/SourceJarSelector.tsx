import { useState, useMemo } from 'react'
import { useField, useFormikContext } from 'formik'
import * as rb from 'react-bootstrap'
import { jarFillLevel, SelectableJar } from '../jars/Jar'
import { noop } from '../../utils'
import { WalletInfo, CurrentWallet } from '../../context/WalletContext'
import styles from './SourceJarSelector.module.css'
import { ShowUtxos } from './ShowUtxos'
import { useTranslation } from 'react-i18next'

export type SourceJarSelectorProps = {
  name: string
  label: string
  className?: string
  variant: 'default' | 'warning'
  walletInfo?: WalletInfo
  wallet: CurrentWallet
  isLoading: boolean
  disabled?: boolean
  isDisplayReloadInShowUtxos: boolean
  setIsDisplayReloadInShowUtxos: (arg: boolean) => void
}

interface ShowUtxosProps {
  jarIndex: String
  isOpen: boolean
}

export const SourceJarSelector = ({
  name,
  label,
  walletInfo,
  wallet,
  variant,
  isLoading,
  disabled = false,
  isDisplayReloadInShowUtxos,
  setIsDisplayReloadInShowUtxos,
}: SourceJarSelectorProps) => {
  const { t } = useTranslation()

  const [field] = useField<JarIndex>(name)
  const form = useFormikContext<any>()
  const [showUtxos, setShowUtxos] = useState<ShowUtxosProps>({
    jarIndex: '',
    isOpen: false,
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
            {showUtxos.isOpen && (
              <ShowUtxos
                walletInfo={walletInfo}
                wallet={wallet}
                isOpen={showUtxos.isOpen}
                onCancel={() => {
                  setShowUtxos({
                    jarIndex: '',
                    isOpen: false,
                  })
                }}
                jarIndex={showUtxos.jarIndex}
                isDisplayReloadInShowUtxos={isDisplayReloadInShowUtxos}
                setIsDisplayReloadInShowUtxos={setIsDisplayReloadInShowUtxos}
              />
            )}
            {jarBalances.map((it) => {
              return (
                <div key={it.accountIndex}>
                  <SelectableJar
                    tooltipText={t('show_utxos.select_utxos')}
                    isOpen={true}
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
                    onClick={(jarIndex: number) => {
                      form.setFieldValue(field.name, jarIndex, true)
                      if (
                        it.accountIndex === field.value &&
                        !disabled &&
                        !isLoading &&
                        it.calculatedTotalBalanceInSats > 0
                      ) {
                        setShowUtxos({
                          jarIndex: it.accountIndex.toString(),
                          isOpen: true,
                        })
                      }
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
