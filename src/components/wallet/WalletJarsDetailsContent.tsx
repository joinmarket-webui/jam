import { useCallback, useEffect, useState } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useJars, type Jar } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface UtxosContentProps {
  jar: Jar
  enabled: boolean
}

export const UtxosContentProps = ({ enabled, jar }: UtxosContentProps) => {
  return (
    <pre aria-disabled={!enabled} className="text-xs">
      {JSON.stringify(jar, null, 2)}
    </pre>
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
      if (e.code === 'ArrowLeft') previousJar()
      else if (e.code === 'ArrowRight') nextJar()
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
      <Tabs value={activeJar?.jarIndex.toString()} className="flex flex-col gap-4">
        <TabsList className="mx-auto flex items-center gap-2">
          {jars.map((it, index) => {
            return (
              <TabsTrigger key={index} value={`${it.jarIndex}`} onClick={() => setActiveJar(it)}>
                {it.name}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <Tabs defaultValue="utxos" className="flex flex-col gap-4">
        <TabsList className="flex items-center gap-2">
          <TabsTrigger value="utxos">{t('jar_details.title_tab_utxos')}</TabsTrigger>
          <TabsTrigger value="jar_details">{t('jar_details.title_tab_jar_details')}</TabsTrigger>
        </TabsList>
        <TabsContent value="utxos" className="flex flex-col gap-2">
          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertTitle>Under construction</AlertTitle>
            <AlertDescription>Not yet implemented.</AlertDescription>
          </Alert>

          <UtxosContentProps enabled={enabled} jar={activeJar} />
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
