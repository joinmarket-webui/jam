import { useMemo, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getAddressInfo } from 'bitcoin-address-validation'
import { useQueryDisplayWallet, type WalletInfoApiObject } from '@/hooks/useQueryDisplayWallet'
import { useQueryUtxos, type Utxo, type UtxoId } from '@/hooks/useQueryUtxos'
import { toBalanceSummary } from '@/lib/balanceSummary'
import * as fb from '@/lib/fidelityBondUtils'
import { delayedPromise, walletDisplayName, type WalletFileName } from '@/lib/utils'
import type { JarIndex, Milliseconds } from '@/types/global'
import {
  JamWalletInfoContext,
  type AccountBranch,
  type AccountMeta,
  type AccountSummary,
  type AddressMeta,
  type AddressSummary,
  type FidelityBondSummary,
  type Jar,
} from './JamWalletInfoContext'

const toAccountSummary = (walletInfo: WalletInfoApiObject): AccountSummary => {
  return walletInfo.accounts.reduce((acc, __raw) => {
    if (__raw.account === undefined) {
      return acc
    }
    const branches = (__raw.branches || [])
      .filter((it) => it.branch !== undefined)
      .map((it) => {
        const [type, derivation] = it.branch!.split('\t')
        return {
          type,
          derivation,
          __raw: it,
        } as AccountBranch
      })

    const meta: AccountMeta = {
      jarIndex: Number.parseInt(String(__raw.account), 10),
      branches,
      __raw,
    }
    acc[meta.jarIndex] = meta
    return acc
  }, {} as AccountSummary)
}

const toAddressSummary = (accountSummary: AccountSummary): AddressSummary => {
  return Object.values(accountSummary)
    .flatMap(
      (it) =>
        it.__raw.branches
          ?.flatMap((branch) => branch.entries || [])
          .flatMap((entry) => ({
            account: it,
            entry,
          })) || [],
    )
    .reduce((acc, { account, entry }) => {
      if (!entry.address || !entry.status) {
        return acc
      }

      const info = getAddressInfo(entry.address)

      const meta: AddressMeta = {
        jarIndex: account.jarIndex,
        address: entry.address,
        used: entry.status !== 'new',
        status: entry.status,
        info: {
          bech32: info.bech32,
          network: info.network,
          type: info.type,
        },
        __raw: entry,
      }
      acc[meta.address] = meta
      return acc
    }, {} as AddressSummary)
}

const toFidelityBondSummary = (utxos: Utxo[]): FidelityBondSummary => {
  const fbOutputs = utxos
    .filter((utxo) => fb.utxo.isFidelityBond(utxo))
    .toSorted((a, b) => {
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

const EMPTY_UTXOS: Utxo[] = []
const EMPTY_BALANCE_SUMMARY = toBalanceSummary(EMPTY_UTXOS)

type JarTemplate = Pick<Jar, 'jarIndex' | 'name' | 'color'>
const jarTemplates: JarTemplate[] = [
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

const EMPTY_ADDRESS_SUMMARY = {} as AddressSummary
const EMPTY_ACCOUNT_SUMMARY = {} as AccountSummary

interface JamWalletInfoContextProviderProps {
  walletFileName: WalletFileName
}

const combinedUtxosHash = (utxos: Utxo[]) => {
  const utxoIds = utxos.map((it) => hexToBytes(it.utxo.split(':')[0]))
  const combinedUtxoIds = new Uint8Array(utxoIds.reduce((acc, current) => [...acc, ...current], [] as number[]))
  return sha256(combinedUtxoIds)
}

type RefetchOptions = { force?: boolean; delayBefore?: Milliseconds }

export const JamWalletInfoContextProvider = ({
  walletFileName,
  children,
}: PropsWithChildren<JamWalletInfoContextProviderProps>) => {
  const { utxos, queryResult: utxosQueryResult } = useQueryUtxos({ walletFileName })
  const utxosHashHex = useMemo(() => bytesToHex(combinedUtxosHash(utxos)), [utxos])
  const { queryResult: displayWalletQueryResult, ...displayWalletQuery } = useQueryDisplayWallet({
    walletFileName,
    utxosHashHex,
  })

  const walletBalanceSummary = toBalanceSummary(utxos)

  const utxosByJarIndex = utxos.reduce((acc, utxo) => {
    const key: JarIndex = utxo.mixdepth
    acc[key] = acc[key] || []
    acc[key].push(utxo)
    return acc
  }, {} as UtxosByJarIndex)

  const jars: Jar[] = []
  Object.entries(utxosByJarIndex).forEach(([jarIndexString, utxos]) => {
    const jarIndex = Number.parseInt(jarIndexString, 10)
    const balanceSummary = toBalanceSummary(utxos)

    const jarTemplate: JarTemplate | undefined = jarTemplatesByJarIndex[jarIndex]
    if (jarTemplate) {
      jars.push({
        ...jarTemplate,
        balanceSummary,
        utxos,
      })
    } else {
      jars.push({
        jarIndex,
        name: `Jar #${jarIndexString}`,
        color: '#808080',
        balanceSummary,
        utxos,
      })
    }
  })

  Object.values(jarTemplatesByJarIndex).forEach((jarTemplate) => {
    const existingJar = jars.find((it) => it.jarIndex === jarTemplate.jarIndex)
    if (!existingJar) {
      jars.push({
        ...jarTemplate,
        balanceSummary: EMPTY_BALANCE_SUMMARY,
        utxos: EMPTY_UTXOS,
      })
    }
  })

  jars.sort((a, b) => a.jarIndex - b.jarIndex)

  const fidelityBondSummary = toFidelityBondSummary(utxos)
  const accountSummary =
    displayWalletQuery.walletInfo === undefined
      ? EMPTY_ACCOUNT_SUMMARY
      : toAccountSummary(displayWalletQuery.walletInfo)
  const addressSummary =
    displayWalletQuery.walletInfo === undefined ? EMPTY_ADDRESS_SUMMARY : toAddressSummary(accountSummary)

  const detectedNetwork = useMemo(() => {
    const eligibleAddress = Object.values(addressSummary).find((it) => it.info !== undefined)
    if (eligibleAddress?.info !== undefined) {
      return eligibleAddress.info.network
    }
    const firstEligibleUtxo = utxos.find((it) => it.external !== true)
    if (firstEligibleUtxo) {
      try {
        return getAddressInfo(firstEligibleUtxo.address).network
      } catch (_ignoredOnPurpose: unknown) {
        console.warn(`Cannot detect network by utxo sample.`)
      }
    }

    return null
  }, [utxos, addressSummary])

  const maxJarAvailableBalance = Math.max(0, ...jars.map((jar) => jar.balanceSummary.calculatedAvailableBalanceInSats))

  const { mutateAsync: refetchMutateAsync, isPending: refetchIsPending } = useMutation({
    scope: {
      id: ['wallet-refetch', walletFileName].join('-'),
    },
    mutationFn: async (options?: { force?: boolean; delayBefore?: Milliseconds }) => {
      if (options?.delayBefore !== undefined && options.delayBefore > 0) {
        await delayedPromise(options.delayBefore)
      }
      return await utxosQueryResult
        .refetch({ throwOnError: true })
        .then((utxos) => displayWalletQueryResult.refetch({ throwOnError: true }).then(() => utxos))
        .then((utxos) => toBalanceSummary((utxos.data?.utxos || []) as Utxo[]))
    },
    retry: false,
  })

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useWaitForUtxosToBeSpent({
    refetch: refetchMutateAsync,
    walletFileName,
    utxos,
  })

  const value = {
    walletName: walletFileName ? walletDisplayName(walletFileName) : null,
    walletBalanceSummary: walletBalanceSummary,
    maxJarAvailableBalance,
    fidelityBondSummary,
    addressSummary,
    accountSummary,
    jars,
    utxosHashHex,

    waitForUtxosToBeSpent,
    setWaitForUtxosToBeSpent,

    detectedNetwork: detectedNetwork ?? null,

    isLoading: utxosQueryResult.isLoading || displayWalletQueryResult.isLoading,
    isFetching: refetchIsPending || utxosQueryResult.isFetching || displayWalletQueryResult.isFetching,
    error: utxosQueryResult.error || displayWalletQueryResult.error,
    refetch: refetchMutateAsync,
    utxosQueryResult: utxosQueryResult,
    displayWalletQueryResult: displayWalletQueryResult,
  }

  return <JamWalletInfoContext.Provider value={value}>{children}</JamWalletInfoContext.Provider>
}

// Delaying the poll requests gives the wallet some time to synchronize
// the utxo set and reduces amount of http requests
const WAIT_FOR_UTXOS_TO_BE_SPENT_DEFAUL_DELAY: Milliseconds = 1_000

const useWaitForUtxosToBeSpent = ({
  refetch,
  walletFileName,
  utxos,
  delay = WAIT_FOR_UTXOS_TO_BE_SPENT_DEFAUL_DELAY,
  resetOnErrors = true,
}: {
  refetch: (options?: RefetchOptions) => Promise<unknown>
  walletFileName: WalletFileName
  utxos: Utxo[]
  delay?: number
  resetOnErrors?: boolean
}): [UtxoId[], Dispatch<SetStateAction<UtxoId[]>>] => {
  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<UtxoId[]>([])
  const { error: waitForUtxosToBeSpentQueryError } = useQuery({
    queryKey: ['wait-for-utxos-to-be-spent', refetch, walletFileName, delay, ...waitForUtxosToBeSpent],
    queryFn: async () => {
      return await refetch({ delayBefore: delay })
    },
    enabled: waitForUtxosToBeSpent.length > 0,
    refetchInterval: 21, // refetch as soon as possible
    refetchIntervalInBackground: true,
  })

  if (waitForUtxosToBeSpentQueryError !== null) {
    if (waitForUtxosToBeSpent.length > 0 && resetOnErrors === true) {
      // Stop waiting for wallet synchronization on errors
      setWaitForUtxosToBeSpent([])
    }
  } else if (waitForUtxosToBeSpent.length > 0) {
    const outputs = new Set(utxos.map((it) => it.utxo))
    const utxosStillPresent = waitForUtxosToBeSpent.filter((it) => outputs.has(it))
    if (utxosStillPresent.length !== waitForUtxosToBeSpent.length) {
      setWaitForUtxosToBeSpent([...utxosStillPresent])
    }
  }

  return [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent]
}
