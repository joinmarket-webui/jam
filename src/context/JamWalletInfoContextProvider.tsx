import type { PropsWithChildren } from 'react'
import { useUtxos, type Utxo } from '@/hooks/useUtxos'
import { toBalanceSummary } from '@/lib/balanceSummary'
import * as fb from '@/lib/fidelityBondUtils'
import { walletDisplayName, type WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { JamWalletInfoContext, type FidelityBondSummary, type Jar } from './JamWalletInfoContext'

const toFidelityBondSummary = (utxos: Utxo[]): FidelityBondSummary => {
  const fbOutputs = utxos
    .filter((utxo) => fb.utxo.isFidelityBond(utxo))
    .sort((a, b) => {
      const aLocked = fb.utxo.isLocked(a)
      const bLocked = fb.utxo.isLocked(b)

      if (aLocked && bLocked) {
        return b.value - a.value
      } else {
        return aLocked ? -1 : 1
      }
    })
  return {
    fbOutputs,
  }
}

type ByJarIndex<T> = {
  [key: JarIndex]: T
}
type UtxosByJarIndex = ByJarIndex<Utxo[]>
type JarTemplateByJarIndex = ByJarIndex<JarTemplate>

const EMPTY_BALANCE_SUMMARY = toBalanceSummary([])

type JarTemplate = Pick<Jar, 'jarIndex' | 'name' | 'color'>
export const jarTemplates: JarTemplate[] = [
  { jarIndex: 0, name: 'Apricot', color: '#e2b86a' },
  { jarIndex: 1, name: 'Blueberry', color: '#3b5ba9' },
  { jarIndex: 2, name: 'Cherry', color: '#c94f7c' },
  { jarIndex: 3, name: 'Date', color: '#a67c52' },
  { jarIndex: 4, name: 'Elderberry', color: '#7c3fa6' },
]

const jarTemplatesByJarIndex = jarTemplates.reduce((acc, jar) => {
  acc[jar.jarIndex] = jar
  return acc
}, {} as JarTemplateByJarIndex)

interface JamWalletInfoContextProviderProps {
  walletFileName: WalletFileName
}

export const JamWalletInfoContextProvider = ({
  walletFileName,
  children,
}: PropsWithChildren<JamWalletInfoContextProviderProps>) => {
  const { utxos, queryResult: utxosQueryResult } = useUtxos({ walletFileName })

  const walletBalanceSummary = toBalanceSummary(utxos)

  const utxosByJarIndex = utxos.reduce((acc, utxo) => {
    const key = utxo.mixdepth as JarIndex
    acc[key] = acc[key] || []
    acc[key].push(utxo as Utxo)
    return acc
  }, {} as UtxosByJarIndex)

  const balanceSummaryByJarIndex = Object.fromEntries(
    Object.entries(utxosByJarIndex).map(([jarIndexString, utxos]) => {
      return [jarIndexString, toBalanceSummary(utxos)]
    }),
  )

  const jars: Jar[] = []
  Object.entries(balanceSummaryByJarIndex).forEach(([jarIndexString, balanceSummary]) => {
    const jarIndex = parseInt(jarIndexString, 10)
    const jarTemplate: JarTemplate | undefined = jarTemplatesByJarIndex[jarIndex]
    if (jarTemplate) {
      jars.push({
        ...jarTemplate,
        balanceSummary,
      })
    } else {
      jars.push({
        jarIndex,
        name: `Jar #${jarIndexString}`,
        color: '#808080',
        balanceSummary,
      })
    }
  })

  Object.entries(jarTemplatesByJarIndex).forEach(([jarIndexString, jarTemplate]) => {
    const jarIndex = parseInt(jarIndexString, 10)
    const existingJar = jars.find((it) => it.jarIndex === jarIndex)
    if (!existingJar) {
      jars.push({
        ...jarTemplate,
        balanceSummary: EMPTY_BALANCE_SUMMARY,
      })
    }
  })

  jars.sort((a, b) => a.jarIndex - b.jarIndex)

  const fidelityBondSummary = toFidelityBondSummary(utxos)

  const value = {
    walletName: walletFileName ? walletDisplayName(walletFileName) : null,
    walletBalanceSummary: walletBalanceSummary,
    fidelityBondSummary,
    jars,
    isLoading: utxosQueryResult.isFetching,
    error: utxosQueryResult.error,
    refetch: utxosQueryResult.refetch,
  }

  return <JamWalletInfoContext.Provider value={value}>{children}</JamWalletInfoContext.Provider>
}
