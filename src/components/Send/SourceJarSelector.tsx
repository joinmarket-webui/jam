import { useMemo } from 'react'
import { useField, useFormikContext } from 'formik'
import * as rb from 'react-bootstrap'
import { jarFillLevel, SelectableJar } from '../jars/Jar'
import { noop } from '../../utils'
import { WalletInfo } from '../../context/WalletContext'
import styles from './SourceJarSelector.module.css'

export type SourceJarSelectorProps = {
  name: string
  label: string
  className?: string
  variant: 'default' | 'warning'
  walletInfo?: WalletInfo
  isLoading: boolean
  disabled?: boolean
}

export const SourceJarSelector = ({
  name,
  label,
  walletInfo,
  variant,
  isLoading,
  disabled = false,
}: SourceJarSelectorProps) => {
  const [field] = useField<JarIndex>(name)
  const form = useFormikContext<any>()

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
            {jarBalances.map((it) => (
              <SelectableJar
                key={it.accountIndex}
                index={it.accountIndex}
                balance={it.calculatedAvailableBalanceInSats}
                frozenBalance={it.calculatedFrozenOrLockedBalanceInSats}
                isSelectable={!disabled && !isLoading && it.calculatedAvailableBalanceInSats > 0}
                isSelected={it.accountIndex === field.value}
                fillLevel={jarFillLevel(
                  it.calculatedTotalBalanceInSats,
                  walletInfo.balanceSummary.calculatedTotalBalanceInSats,
                )}
                variant={it.accountIndex === field.value ? variant : undefined}
                onClick={(jarIndex) => form.setFieldValue(field.name, jarIndex, true)}
              />
            ))}
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
