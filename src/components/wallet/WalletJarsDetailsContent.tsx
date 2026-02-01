import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RowModel, RowSelectionState } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { AlertTriangleIcon, ThermometerSnowflakeIcon, ThermometerSunIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  useAccountSummary,
  useAddressSummary,
  useJars,
  type AccountMeta,
  type AddressSummary,
  type Jar,
} from '@/context/JamWalletInfoContext'
import type { Utxo, UtxoId } from '@/hooks/useQueryUtxos'
import { utxoTags } from '@/lib/tags'
import { cn } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Button } from '../ui/button'
import { Balance } from '../ui/jam/Balance'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AccountDetailsTabContent } from './AccountDetailsTabContent'
import { JarUtxosTable, type UtxoTableEntry } from './JarUtxosTable'

const isKeyEventFromInputElement = (e: KeyboardEvent) => {
  return (
    e.target &&
    (('tagName' in e.target &&
      (e.target['tagName'] === 'BUTTON' ||
        e.target['tagName'] === 'AUDIO' ||
        e.target['tagName'] === 'VIDEO' ||
        e.target['tagName'] === 'SEARCH' ||
        e.target['tagName'] === 'SELECT' ||
        e.target['tagName'] === 'INPUT' ||
        e.target['tagName'] === 'TEXTAREA')) ||
      ('isContentEditable' in e.target && e.target.isContentEditable === true))
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
  jar: Jar
  addressSummary: AddressSummary
}

export const UtxosContent = ({ enabled, addressSummary, jar }: UtxosContentProps) => {
  const { t } = useTranslation()

  const [_tableRowModel, setTableRowModel] = useState<RowModel<UtxoTableEntry>>()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

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
  }, [rowSelection, utxosByUtxoId])

  const allSelectedUtxosFrozen = selectedUtxos.every((it) => it.frozen === true)
  const allSelectedUtxosUnfrozen = selectedUtxos.every((it) => it.frozen === false)

  const operationsEnabled = enabled && selectedUtxos.length > 0
  // TODO: makerRunning, takerRunner, rescanRunning, etc.

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 gap-2">
          {t('jar_details.utxo_list.title', { count: jar.utxos.length, jar: jar.name })}
        </div>
        <div className="flex items-center gap-1">
          <Trans i18nKey="jar_details.utxo_list.text_balance_sum_total">
            <Balance colored={false} valueString={String(jar.balanceSummary.calculatedTotalBalanceInSats)} />
          </Trans>
        </div>
      </div>
      <div
        className={cn('flex items-center gap-2', {
          invisible: Object.values(rowSelection).length === 0,
        })}
      >
        <Button
          size="sm"
          disabled={!operationsEnabled || allSelectedUtxosFrozen}
          onClick={() => {
            toast.error('Freezing not yet implemented!')
          }}
        >
          <ThermometerSnowflakeIcon />
          {t('jar_details.utxo_list.button_freeze')}
        </Button>
        <Button
          size="sm"
          disabled={!operationsEnabled || allSelectedUtxosUnfrozen}
          onClick={() => {
            toast.error('Unfreezing not yet implemented!')
          }}
        >
          <ThermometerSunIcon />
          {t('jar_details.utxo_list.button_unfreeze')}
        </Button>
        {}
      </div>
      <JarUtxosTable
        tableEntries={tableEntries}
        pinnedEntries={[]}
        globalFilter={''}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onChange={(table) => {
          setTableRowModel(table.getFilteredRowModel())
        }}
      />
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
  selectJarIndex?: JarIndex
  className?: string
  debug?: boolean
}

export const WalletJarsDetailsContent = ({
  enabled,
  className,
  selectJarIndex,
  debug,
}: WalletJarsDetailsContentProps) => {
  const { t } = useTranslation()
  const { jars } = useJars()
  const { addressSummary } = useAddressSummary()
  const { accountSummary } = useAccountSummary()

  const [activeJar, setActiveJar] = useState<Jar | undefined>(() => {
    const jar = jars.find((it) => it.jarIndex === selectJarIndex)
    return jar ?? jars[0] ?? undefined
  })
  const activeAccountMeta = useMemo(
    () => (activeJar ? accountSummary[activeJar.jarIndex] : undefined),
    [accountSummary, activeJar],
  )

  const nextJar = useCallback(() => {
    setActiveJar((current) =>
      current ? (jars.find((it) => it.jarIndex === current?.jarIndex + 1) ?? jars[0]) : jars[0],
    )
  }, [jars])
  const previousJar = useCallback(
    () =>
      setActiveJar((current) =>
        current ? (jars.find((it) => it.jarIndex === current?.jarIndex - 1) ?? jars[jars.length - 1]) : jars[0],
      ),
    [jars],
  )

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (isKeyEventFromInputElement(e)) {
        return
      }

      if (e.code === 'ArrowLeft') {
        previousJar()
      } else if (e.code === 'ArrowRight') {
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
        value={activeJar?.jarIndex.toString()}
        onValueChange={(value) => {
          const jarIndex = parseInt(value, 10)
          setActiveJar(jars.find((it) => it.jarIndex === jarIndex) ?? jars[0] ?? undefined)
        }}
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
        <AlertTitle>Under construction</AlertTitle>
        <AlertDescription>Not yet implemented.</AlertDescription>
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
          <UtxosContent enabled={enabled} jar={activeJar} addressSummary={addressSummary} />
        </TabsContent>
        <TabsContent value="jar_details">
          {activeAccountMeta !== undefined ? (
            <DetailsContent enabled={enabled} account={activeAccountMeta}></DetailsContent>
          ) : (
            <Alert variant="warning">
              <AlertTriangleIcon />
              <AlertTitle>{/* TODO: i18n */}No account information present</AlertTitle>
              <AlertDescription>Account information is not yet loaded or not present.</AlertDescription>
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
