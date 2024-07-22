import { useState, useMemo, useCallback, useEffect } from 'react'
import { useField, useFormikContext } from 'formik'
import * as rb from 'react-bootstrap'
import { jarFillLevel, SelectableJar } from '../jars/Jar'
import { noop } from '../../utils'
import { WalletInfo, CurrentWallet, useReloadCurrentWalletInfo, Utxo } from '../../context/WalletContext'
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
  wallet: CurrentWallet
  isLoading: boolean
  disabled?: boolean
}

interface ShowUtxosProps {
  jarIndex?: string
  isOpen?: boolean
}

export type UtxoList = Utxo[]

export const SourceJarSelector = ({
  name,
  label,
  walletInfo,
  wallet,
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
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [showUtxos, setShowUtxos] = useState<ShowUtxosProps | undefined>(undefined)
  const [alert, setAlert] = useState<SimpleAlert | undefined>(undefined)
  const [isUtxosLoading, setIsUtxosLoading] = useState<boolean>(false)
  const [unFrozenUtxos, setUnFrozenUtxos] = useState<UtxoList>([])
  const [frozenUtxos, setFrozenUtxos] = useState<UtxoList>([])

  const jarBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  useEffect(() => {
    if (showUtxos?.jarIndex && walletInfo?.utxosByJar) {
      const data = Object.entries(walletInfo.utxosByJar).find(([key]) => key === showUtxos.jarIndex)
      const utxos: any = data ? data[1] : []

      const frozenUtxoList = utxos
        .filter((utxo: any) => utxo.frozen)
        .map((utxo: any) => ({ ...utxo, id: utxo.utxo, checked: false }))
      const unFrozenUtxosList = utxos
        .filter((utxo: any) => !utxo.frozen)
        .map((utxo: any) => ({ ...utxo, id: utxo.utxo, checked: true }))

      setFrozenUtxos(frozenUtxoList)
      setUnFrozenUtxos(unFrozenUtxosList)
    }
  }, [walletInfo, showUtxos?.jarIndex, t])

  useEffect(() => {
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
  }, [frozenUtxos, unFrozenUtxos, t, setAlert])

  const handleUtxosFrozenState = useCallback(async () => {
    const abortCtrl = new AbortController()
    const frozenUtxosToUpdate = frozenUtxos
      .filter((utxo) => utxo.checked && !utxo.locktime)
      .map((utxo) => ({ utxo: utxo.utxo, freeze: false }))
    const unFrozenUtxosToUpdate = unFrozenUtxos
      .filter((utxo) => !utxo.checked)
      .map((utxo) => ({ utxo: utxo.utxo, freeze: true }))

    try {
      const res = await Promise.all([
        ...frozenUtxosToUpdate.map((utxo) => Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, utxo)),
        ...unFrozenUtxosToUpdate.map((utxo) => Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, utxo)),
      ])

      if (res.length !== 0) {
        setIsUtxosLoading(true)
        await reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal })
      }

      setShowUtxos(undefined)
    } catch (err: any) {
      if (!abortCtrl.signal.aborted) {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      }
    } finally {
      setIsUtxosLoading(false)
    }
  }, [frozenUtxos, unFrozenUtxos, wallet, reloadCurrentWalletInfo])

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
            {showUtxos?.isOpen && (
              <ShowUtxos
                isOpen={showUtxos.isOpen}
                onConfirm={handleUtxosFrozenState}
                onCancel={() => {
                  setShowUtxos(undefined)
                }}
                alert={alert}
                isLoading={isUtxosLoading}
                frozenUtxos={frozenUtxos}
                unFrozenUtxos={unFrozenUtxos}
                setFrozenUtxos={setFrozenUtxos}
                setUnFrozenUtxos={setUnFrozenUtxos}
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
