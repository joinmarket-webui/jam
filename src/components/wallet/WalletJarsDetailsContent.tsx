import { useCallback, useEffect, useMemo, useState } from 'react'
import { freezeMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import type { RowSelectionState } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { AlertTriangleIcon, RefreshCwIcon, ThermometerSnowflakeIcon, ThermometerSunIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  useAccountSummary,
  useAddressSummary,
  useJamWalletInfoContext,
  useJars,
  type AccountMeta,
  type AddressSummary,
  type Jar,
} from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { Utxo, UtxoId } from '@/hooks/useQueryUtxos'
import { utxoTags } from '@/lib/tags'
import { cn, type WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Button } from '../ui/button'
import { ButtonGroup } from '../ui/button-group'
import { Input } from '../ui/input'
import { Balance } from '../ui/jam/Balance'
import { Spinner } from '../ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AccountDetailsTabContent } from './AccountDetailsTabContent'
import { JarUtxosTable, type UtxoTableEntry } from './JarUtxosTable'

const isKeyEventFromInputElement = (event: KeyboardEvent) => {
  return (
    event.target &&
    (('tagName' in event.target &&
      (event.target['tagName'] === 'BUTTON' ||
        event.target['tagName'] === 'AUDIO' ||
        event.target['tagName'] === 'VIDEO' ||
        event.target['tagName'] === 'SEARCH' ||
        event.target['tagName'] === 'SELECT' ||
        event.target['tagName'] === 'INPUT' ||
        event.target['tagName'] === 'TEXTAREA')) ||
      ('isContentEditable' in event.target && event.target.isContentEditable === true))
  )
}

const utxoToTableEntry = (utxo: Utxo, addressSummary: AddressSummary, t: TFunction): UtxoTableEntry => {
  return {
    ...utxo,
    tags: utxoTags(utxo, addressSummary, t),
  }
}

interface UtxosContentProps {
  enabled: boolean
  walletFileName: WalletFileName
  jar: Jar
  addressSummary: AddressSummary
}

export const UtxosContent = ({ enabled, walletFileName, addressSummary, jar }: UtxosContentProps) => {
  const { t } = useTranslation()
  const walletInfo = useJamWalletInfoContext()

  const client = useApiClient()

  const freezeOrUnfreezeUtxo = useMutation({
    ...freezeMutation({ client }),
    retry: false,
  })

  const freezeOrUnfreezeUtxos = useMutation({
    mutationFn: async ({ values, freeze }: { values: Utxo[]; freeze: boolean }) => {
      return Promise.allSettled(
        values.map((utxo) =>
          freezeOrUnfreezeUtxo
            .mutateAsync({
              path: {
                walletname: encodeURIComponent(walletFileName),
              },
              body: {
                'utxo-string': utxo.utxo,
                freeze,
              },
            })
            .then((it) => ({ ...it, utxo })),
        ),
      )
    },
  })
  const freezeUtxos = useMutation({
    mutationFn: (values: Utxo[]) =>
      freezeOrUnfreezeUtxos.mutateAsync({ values, freeze: true }).then((it) => walletInfo.refetch().then(() => it)),
  })
  const unfreezeUtxos = useMutation({
    mutationFn: (values: Utxo[]) =>
      freezeOrUnfreezeUtxos.mutateAsync({ values, freeze: false }).then((it) => walletInfo.refetch().then(() => it)),
  })

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [searchFilter, setSearchFilter] = useState('')

  const tableEntries = useMemo(() => {
    return jar.utxos.map((it) => utxoToTableEntry(it, addressSummary, t))
  }, [addressSummary, t, jar])

  const utxosByUtxoId = useMemo(
    () =>
      jar.utxos.reduce(
        (acc, utxo) => {
          acc[utxo.utxo] = utxo
          return acc
        },
        {} as Record<UtxoId, Utxo>,
      ),
    [jar.utxos],
  )

  const selectedUtxos = useMemo(() => {
    return Object.entries(rowSelection)
      .filter(([_, checked]) => checked === true)
      .map(([key]) => utxosByUtxoId[key as UtxoId])
      .filter((it) => it !== undefined)
  }, [rowSelection, utxosByUtxoId])

  const allSelectedUtxosFrozen = selectedUtxos.every((it) => it?.frozen === true)
  const allSelectedUtxosUnfrozen = selectedUtxos.every((it) => it?.frozen === false)

  const reusedCount = useMemo(() => {
    return tableEntries.filter((entry) => entry.tags.some((tag) => tag.value === 'reused')).length
  }, [tableEntries])

  // TODO: makerRunning, takerRunner, rescanRunning, etc.
  const operationsEnabled = enabled && !(walletInfo.isFetching || freezeUtxos.isPending || unfreezeUtxos.isPending)

  const onFreezeClick = async () => {
    const selectedAddresses = new Set(selectedUtxos.map((it) => it.address))
    const eligibleUtxos = jar.utxos.filter((it) => selectedAddresses.has(it.address))

    if (eligibleUtxos.length > selectedUtxos.length) {
      // TODO: i18n
      toast.warning('Security measure: Freeze additional UTXOs', {
        description: `Automatically freezing ${eligibleUtxos.length - selectedUtxos.length} additional UTXOs. They should be spent together.`,
      })
    }

    try {
      const result = await freezeUtxos.mutateAsync(eligibleUtxos)
      const fulfilled = result.filter((it) => it.status === 'fulfilled')
      const rejected = result.filter((it) => it.status === 'rejected')
      if (rejected.length === 0) {
        toast.success(t('jar_details.utxo_list.toast_freeze_success', { count: fulfilled.length }))
      } else {
        toast.warning(t('jar_details.utxo_list.toast_freeze_error', { count: rejected.length }))
      }
    } catch (_ignoredOnPurpose) {
      toast.warning(t('jar_details.utxo_list.toast_freeze_error', { count: selectedUtxos.length }))
    }
  }

  const onUnfreezeClick = async () => {
    const selectedAddresses = new Set(selectedUtxos.map((it) => it.address))
    const eligibleUtxos = jar.utxos.filter((it) => selectedAddresses.has(it.address))

    if (eligibleUtxos.length > selectedUtxos.length) {
      // TODO: i18n
      toast.warning('Security measure: Unfreeze additional UTXOs', {
        description: `Automatically unfreezing ${eligibleUtxos.length - selectedUtxos.length} additional UTXOs. They should be spent together.`,
      })
    }

    try {
      const result = await unfreezeUtxos.mutateAsync(eligibleUtxos)
      const fulfilled = result.filter((it) => it.status === 'fulfilled')
      const rejected = result.filter((it) => it.status === 'rejected')
      if (rejected.length === 0) {
        toast.success(t('jar_details.utxo_list.toast_unfreeze_success', { count: fulfilled.length }))
      } else {
        toast.warning(t('jar_details.utxo_list.toast_unfreeze_error', { count: rejected.length }))
      }
    } catch (_ignoredOnPurpose) {
      toast.warning(t('jar_details.utxo_list.toast_unfreeze_error', { count: selectedUtxos.length }))
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 gap-2">
          {t('jar_details.utxo_list.title', { count: jar.utxos.length, jar: jar.name })}
        </div>
        <div className="flex items-center gap-1">
          <Trans i18nKey="jar_details.utxo_list.text_balance_sum_total">
            <Balance valueString={String(jar.balanceSummary.calculatedTotalBalanceInSats)} />
          </Trans>
        </div>
      </div>
      <div className={cn('flex items-center gap-2', {})}>
        <Button
          size="sm"
          disabled={!operationsEnabled || walletInfo.isFetching}
          onClick={() => void walletInfo.refetch()}
        >
          <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': walletInfo.isFetching })} />
          {t('global.refresh')}
        </Button>
        <ButtonGroup>
          <Button
            size="sm"
            variant={selectedUtxos.length === 0 ? 'outline' : undefined}
            disabled={!operationsEnabled || selectedUtxos.length === 0 || allSelectedUtxosFrozen}
            onClick={() => void onFreezeClick()}
          >
            {freezeUtxos.isPending ? <Spinner /> : <ThermometerSnowflakeIcon />}
            {t('jar_details.utxo_list.button_freeze')}
          </Button>
          <Button
            size="sm"
            variant={selectedUtxos.length === 0 ? 'outline' : undefined}
            disabled={!operationsEnabled || selectedUtxos.length === 0 || allSelectedUtxosUnfrozen}
            onClick={() => void onUnfreezeClick()}
          >
            {unfreezeUtxos.isPending ? <Spinner /> : <ThermometerSunIcon />}
            {t('jar_details.utxo_list.button_unfreeze')}
          </Button>
        </ButtonGroup>
        {}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder={t('jar_details.utxo_list.placeholder_search')}
          value={searchFilter}
          onChange={(event_) => setSearchFilter(event_.target.value)}
          className="max-w-xs"
        />
      </div>
      <JarUtxosTable
        tableEntries={tableEntries}
        pinnedEntries={[]}
        globalFilter={searchFilter}
        onRowSelectionChange={setRowSelection}
      />
      {reusedCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertDescription>
            {t('jar_details.utxo_list.alert_reused_address', { count: reusedCount })}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

interface DetailsContentProps {
  enabled: boolean
  account: AccountMeta
}

export const DetailsContent = ({ enabled: _enabled, account }: DetailsContentProps) => {
  return <AccountDetailsTabContent value={account} />
}

interface WalletJarsDetailsContentProps {
  enabled: boolean
  walletFileName: WalletFileName
  selectedJarIndex?: JarIndex
  className?: string
  debug?: boolean
}

export const WalletJarsDetailsContent = ({
  enabled,
  walletFileName,
  selectedJarIndex,
  className,
  debug,
}: WalletJarsDetailsContentProps) => {
  const { t } = useTranslation()
  const { jars } = useJars()
  const { addressSummary } = useAddressSummary()
  const { accountSummary } = useAccountSummary()

  const [activeJarIndex, setActiveJarIndex] = useState<JarIndex | undefined>(() => {
    const jar = jars.find((it) => it.jarIndex === selectedJarIndex)
    return (jar ?? jars[0])?.jarIndex
  })

  const activeJar = useMemo<Jar | undefined>(() => {
    return jars.find((it) => it.jarIndex === activeJarIndex)
  }, [jars, activeJarIndex])

  const activeAccountMeta = useMemo(
    () => (activeJar ? accountSummary[activeJar.jarIndex] : undefined),
    [accountSummary, activeJar],
  )

  const nextJar = useCallback(() => {
    setActiveJarIndex(
      (current) => (current ? (jars.find((it) => it.jarIndex === current + 1) ?? jars[0]) : jars[0])?.jarIndex,
    )
  }, [jars])

  const previousJar = useCallback(
    () =>
      setActiveJarIndex(
        (current) => (current ? (jars.find((it) => it.jarIndex === current - 1) ?? jars.at(-1)) : jars[0])?.jarIndex,
      ),
    [jars],
  )

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (isKeyEventFromInputElement(event)) {
        return
      }

      if (event.code === 'ArrowLeft') {
        previousJar()
      } else if (event.code === 'ArrowRight') {
        nextJar()
      }
    }
    const abortCtrl = new AbortController()
    document.addEventListener('keydown', onKeyDown, { signal: abortCtrl.signal })
    return () => abortCtrl.abort()
  }, [enabled, nextJar, previousJar])

  if (!activeJar) {
    return <></>
  }

  return (
    <div className={cn('mx-auto space-y-3', className)}>
      <Tabs
        value={activeJar.jarIndex.toString()}
        onValueChange={(value) => setActiveJarIndex(Number.parseInt(value, 10))}
        className="flex flex-col gap-4"
      >
        <TabsList className="mx-auto flex items-center gap-2">
          {jars.map((it, index) => {
            return (
              <TabsTrigger key={index} value={`${it.jarIndex}`} className="cursor-pointer" disabled={!enabled}>
                {it.name}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertTitle>{t('jar_details.utxo_list.alert_under_construction_title')}</AlertTitle>
        <AlertDescription>{t('jar_details.utxo_list.alert_under_construction_description')}</AlertDescription>
      </Alert>
      <Tabs defaultValue="utxos" className="flex flex-col gap-4">
        <TabsList className="mx-auto flex items-center gap-2">
          <TabsTrigger value="utxos" className="cursor-pointer" disabled={!enabled}>
            {t('jar_details.title_tab_utxos')}
          </TabsTrigger>
          <TabsTrigger value="jar_details" className="cursor-pointer" disabled={!enabled}>
            {t('jar_details.title_tab_jar_details')}
          </TabsTrigger>
          {debug && (
            <TabsTrigger value="dev" className="cursor-pointer" disabled={!enabled}>
              Dev <DevBadge />
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="utxos" className="flex flex-col gap-2">
          <UtxosContent
            key={activeJar.jarIndex}
            enabled={enabled}
            walletFileName={walletFileName}
            jar={activeJar}
            addressSummary={addressSummary}
          />
        </TabsContent>
        <TabsContent value="jar_details">
          {activeAccountMeta !== undefined ? (
            <DetailsContent key={activeJar.jarIndex} enabled={enabled} account={activeAccountMeta}></DetailsContent>
          ) : (
            <Alert variant="warning">
              <AlertTriangleIcon />
              <AlertTitle>{t('jar_details.utxo_list.alert_no_account_info_title')}</AlertTitle>
              <AlertDescription>{t('jar_details.utxo_list.alert_no_account_info_description')}</AlertDescription>
            </Alert>
          )}
        </TabsContent>
        {debug && (
          <TabsContent value="dev">
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">activeJar:</code>
              <pre className="text-xs">{JSON.stringify(activeJar, null, 2)}</pre>
            </div>
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">activeAccountMeta:</code>
              <pre className="text-xs">{JSON.stringify(activeAccountMeta, null, 2)}</pre>
            </div>
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">addressSummary:</code>
              <pre className="text-xs">{JSON.stringify(addressSummary, null, 2)}</pre>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
