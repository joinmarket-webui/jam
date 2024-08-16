import { useState, useMemo, useCallback } from 'react'
import { useField, useFormikContext } from 'formik'
import * as rb from 'react-bootstrap'
import { jarFillLevel, SelectableJar } from '../jars/Jar'
import { noop } from '../../utils'
import { WalletInfo, CurrentWallet, useReloadCurrentWalletInfo, Utxos } from '../../context/WalletContext'
import styles from './SourceJarSelector.module.css'
import { ShowUtxos } from './ShowUtxos'
import { useTranslation } from 'react-i18next'
import * as Api from '../../libs/JmWalletApi'

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

interface ShowUtxosProps {
  utxos: Utxos
  isLoading: boolean
  alert?: SimpleAlert
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
  const { t } = useTranslation()
  const [field] = useField<JarIndex>(name)
  const form = useFormikContext<any>()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [showUtxos, setShowUtxos] = useState<ShowUtxosProps>()
  //const [unFrozenUtxos, setUnFrozenUtxos] = useState<Utxos>([])
  //const [frozenUtxos, setFrozenUtxos] = useState<Utxos>([])

  const jarBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  /*useEffect(() => {
    if (frozenUtxos.length === 0 && unFrozenUtxos.length === 0) {
      return
    }
    const frozenUtxosToUpdate = frozenUtxos.filter((utxo: Utxo) => utxo.checked && !utxo.locktime)
    const timeLockedUtxo = frozenUtxos.find((utxo: Utxo) => utxo.checked && utxo.locktime)
    const allUnFrozenUnchecked = unFrozenUtxos.every((utxo: Utxo) => !utxo.checked)

    if (frozenUtxos.length > 0 && timeLockedUtxo) {
      setAlert({ variant: 'danger', message: `${t('show_utxos.alert_for_time_locked')} ${timeLockedUtxo.locktime}` })
    } else if (
      (frozenUtxos.length > 0 || unFrozenUtxos.length > 0) &&
      allUnFrozenUnchecked &&
      frozenUtxosToUpdate.length === 0
    ) {
      setAlert({ variant: 'warning', message: t('show_utxos.alert_for_unfreeze_utxos'), dismissible: true })
    } else {
      setAlert(undefined)
    }
  }, [frozenUtxos, unFrozenUtxos, t, setAlert])*/

  const handleUtxosFrozenState = useCallback(
    async (selectedUtxos: Utxos) => {
      if (!showUtxos) return

      const abortCtrl = new AbortController()

      const selectedUtxosIds = selectedUtxos.map((it) => it.utxo)
      const frozenUtxosToUnfreeze = selectedUtxos.filter((utxo) => utxo.frozen)
      const unfrozenUtxosToFreeze = showUtxos.utxos
        .filter((utxo) => !utxo.frozen)
        .filter((it) => !selectedUtxosIds.includes(it.utxo))

      try {
        setShowUtxos({ ...showUtxos, isLoading: true, alert: undefined })

        const res = await Promise.all([
          ...frozenUtxosToUnfreeze.map((utxo) =>
            Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, { utxo: utxo.utxo, freeze: false }),
          ),
          ...unfrozenUtxosToFreeze.map((utxo) =>
            Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, { utxo: utxo.utxo, freeze: true }),
          ),
        ])

        if (res.length !== 0) {
          await reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal })
        }

        setShowUtxos(undefined)
      } catch (err: any) {
        if (abortCtrl.signal.aborted) return
        setShowUtxos({ ...showUtxos, isLoading: false, alert: { variant: 'danger', message: err.message } })
      }
    },
    [showUtxos, wallet, reloadCurrentWalletInfo],
  )

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
            {showUtxos && (
              <ShowUtxos
                isOpen={true}
                isLoading={showUtxos.isLoading}
                utxos={showUtxos.utxos}
                alert={showUtxos.alert}
                onConfirm={handleUtxosFrozenState}
                onCancel={() => setShowUtxos(undefined)}
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
                    onClick={(jarIndex) => {
                      form.setFieldValue(field.name, jarIndex, true)
                      if (
                        it.accountIndex === field.value &&
                        !disabled &&
                        !isLoading &&
                        it.calculatedTotalBalanceInSats > 0
                      ) {
                        setShowUtxos({
                          utxos: walletInfo.utxosByJar[it.accountIndex],
                          isLoading: false,
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
