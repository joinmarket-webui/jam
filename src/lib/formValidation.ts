import {
  getAddressInfo,
  Network,
  validate as isValidBitcoinAddress,
  AddressType,
  type AddressInfo,
} from 'bitcoin-address-validation'
import * as yup from 'yup'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import type { BitcoinAddress, BlockHeight, JarIndex } from '@/types/global'
import { isValidInteger } from './utils'

export const normalizeBitcoinAddress = (value: string): string => {
  const trimmed = value.trim()
  if (trimmed !== trimmed.toUpperCase()) return trimmed

  const lowercased = trimmed.toLowerCase()
  try {
    return getAddressInfo(lowercased).bech32 ? lowercased : trimmed
  } catch (_ignoredOnPurpose) {
    return trimmed
  }
}

/**
 * Shared bitcoin-address predicates used across form schemas (send, sweep, ...).
 * Keeping these in one place ensures every form validates addresses the same way.
 */
export const isValidAddress = (value: unknown): value is BitcoinAddress =>
  typeof value === 'string' && isValidBitcoinAddress(normalizeBitcoinAddress(value))

// p2pkh/p2sh addresses (base58) share the same version bytes on testnet and regtest, so
// address validation can't tell them apart and always labels them "testnet".
// Treat the two as interchangeable for those so a regtest wallet doesn't reject its own
// legacy-style addresses as "wrong network".
// Types like p2wpkh/p2tr (bech32) carry a distinct HRP per network (tb1 vs bcrt1), so they are
// already identified correctly - don't relax them, or a bcrt1… (regtest) address would
// wrongly pass on a testnet wallet and vice versa. Only base58 addresses are ambiguous.
const AMBIGUOUS_NETWORKS_BY_ADDRESS_TYPE: ReadonlyMap<AddressType, Network[]> = new Map([
  [AddressType.p2pkh, [Network.testnet, Network.regtest]],
  [AddressType.p2sh, [Network.testnet, Network.regtest]],
])

const isAmbiguousAddressForNetwork = (info: AddressInfo, expectedNetwork: Network) => {
  // Bech32/bech32m addresses carry a distinct HRP per network (tb1 vs bcrt1), so they are
  // already identified correctly - don't relax them, or a bcrt1… (regtest) address would
  // wrongly pass on a testnet wallet and vice versa. Only base58 addresses are ambiguous.
  return [info.network, expectedNetwork].every(
    (it) => AMBIGUOUS_NETWORKS_BY_ADDRESS_TYPE.get(info.type)?.includes(it) ?? false,
  )
}

export const isAddressOnNetwork = (value: string, expectedNetwork: Network): boolean => {
  try {
    const addressInfo = getAddressInfo(normalizeBitcoinAddress(value))
    if (addressInfo.network === expectedNetwork) return true
    return isAmbiguousAddressForNetwork(addressInfo, expectedNetwork)
  } catch (_ignoredOnPurpose) {
    return false
  }
}

export const isReusedAddress = (value: string, addressSummary: AddressSummary): boolean =>
  addressSummary[normalizeBitcoinAddress(value)]?.used === true

/**
 * Shared "source jar" (`fromJar`) field validator.
 *
 * Callers provide the feedback message and the predicate that decides whether a jar index is
 * selectable, e.g. "the jar exists" (receive / fidelity bond) or "the jar has spendable balance"
 * (send). This keeps the yup rules for the common `fromJar` field aligned across forms.
 */
export const sourceJarField = (message: string, isSelectableJar: (jarIndex: JarIndex) => boolean) =>
  yup
    .number<JarIndex>()
    .integer(message)
    .required(message)
    .test('valid-source-jar-index-test', message, (value) => typeof value === 'number' && isSelectableJar(value))

export type DestinationAddressMessages = {
  invalid: string
  networkMismatch: string
  reused: string
}

/**
 * Shared destination bitcoin-address field validator: valid address, matching network and not
 * previously used. Forms that validate a single destination address (e.g. send) can reuse this
 * instead of re-declaring the same chain of `.test(...)` rules.
 */
export const destinationAddressField = ({
  network,
  addressSummary,
  messages,
}: {
  network: Network
  addressSummary: AddressSummary
  messages: DestinationAddressMessages
}) =>
  yup
    .string()
    .trim()
    .transform((value: unknown) => (typeof value === 'string' ? normalizeBitcoinAddress(value) : value))
    .required(messages.invalid)
    .test('valid-address-test', messages.invalid, (value) => isValidAddress(value))
    // The network and reuse checks only run once the address itself is valid, so an invalid
    // address surfaces a single, correct error instead of also reporting a network mismatch.
    .test(
      'network-mismatch-test',
      messages.networkMismatch,
      (value) => !isValidAddress(value) || isAddressOnNetwork(value, network),
    )
    .test(
      'reused-address-test',
      messages.reused,
      (value) =>
        !isValidAddress(value) || !isAddressOnNetwork(value, network) || !isReusedAddress(value, addressSummary),
    )

export type BlockHeightMessages = {
  invalid: string
}

export const INPUT_BLOCK_HEIGHT_MIN = 0
const INPUT_BLOCK_HEIGHT_MAX = Number.MAX_SAFE_INTEGER

export const blockHeightField = ({
  currentBlockHeight,
  messages: { invalid },
}: {
  currentBlockHeight: BlockHeight | undefined
  messages: {
    invalid: ({ min, max }: { min: BlockHeight; max: BlockHeight }) => string
  }
}) => {
  const minBlockHeight = Math.min(INPUT_BLOCK_HEIGHT_MIN, currentBlockHeight || INPUT_BLOCK_HEIGHT_MIN)
  const maxBlockheight = Math.max(minBlockHeight, currentBlockHeight ?? INPUT_BLOCK_HEIGHT_MAX)
  const invalidBlockheightMessage = invalid({ min: minBlockHeight, max: maxBlockheight })

  return yup
    .number()
    .transform((value) => (isValidInteger(value) ? value : null))
    .integer(invalidBlockheightMessage)
    .min(minBlockHeight, invalidBlockheightMessage)
    .max(maxBlockheight, invalidBlockheightMessage)
    .required(invalidBlockheightMessage)
}
