import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RowModel } from '@tanstack/react-table'
import { AlertTriangleIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { useJars, type Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useUtxos'
import { cn } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Balance } from '../ui/jam/Balance'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
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

const utxoToTableEntry = (utxo: Utxo): UtxoTableEntry => {
  return {
    ...utxo,
  }
}

interface UtxosContentProps {
  jar: Jar
  enabled: boolean
}

export const UtxosContent = ({ enabled, jar }: UtxosContentProps) => {
  const { t } = useTranslation()

  const [_tableRowModel, setTableRowModel] = useState<RowModel<UtxoTableEntry>>()

  const tableEntries = useMemo(() => {
    return jar.utxos.map((it) => utxoToTableEntry(it))
  }, [jar])

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
      <JarUtxosTable
        tableEntries={tableEntries}
        selectedEntries={[]}
        pinnedEntries={[]}
        globalFilter={''}
        onChange={(table) => {
          setTableRowModel(table.getFilteredRowModel())
        }}
      />
      <pre aria-disabled={!enabled} className="text-xs">
        {JSON.stringify(jar, null, 2)}
      </pre>
    </>
  )
}

interface WalletJarsDetailsContentProps {
  enabled: boolean
  selectJarIndex?: JarIndex
  className?: string
}

export const WalletJarsDetailsContent = ({ enabled, className, selectJarIndex }: WalletJarsDetailsContentProps) => {
  const { t } = useTranslation()
  const { jars } = useJars()

  const [activeJar, setActiveJar] = useState<Jar | undefined>(() => {
    const jar = jars.find((it) => it.jarIndex === selectJarIndex)
    return jar ?? jars[0] ?? undefined
  })

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

      <Tabs defaultValue="utxos" className="flex flex-col gap-4">
        <TabsList className="mx-auto flex items-center gap-2">
          <TabsTrigger value="utxos" className="cursor-pointer" disabled={!enabled}>
            {t('jar_details.title_tab_utxos')}
          </TabsTrigger>
          <TabsTrigger value="jar_details" className="cursor-pointer" disabled={!enabled}>
            {t('jar_details.title_tab_jar_details')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="utxos" className="flex flex-col gap-2">
          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertTitle>Under construction</AlertTitle>
            <AlertDescription>Not yet implemented.</AlertDescription>
          </Alert>

          <UtxosContent enabled={enabled} jar={activeJar} />
        </TabsContent>
        <TabsContent value="jar_details">
          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertTitle>Under construction</AlertTitle>
            <AlertDescription>Not yet implemented.</AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
