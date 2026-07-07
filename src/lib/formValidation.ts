import { getAddressInfo, validate as isValidBitcoinAddress, type Network } from 'bitcoin-address-validation'
import * as yup from 'yup'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import type { BitcoinAddress, JarIndex } from '@/types/global'

/**
 * Shared bitcoin-address predicates used across form schemas (send, sweep, ...).
 * Keeping these in one place ensures every form validates addresses the same way.
 */
export const isValidAddress = (value: unknown): value is BitcoinAddress =>
  typeof value === 'string' && isValidBitcoinAddress(value)

export const isAddressOnNetwork = (value: string, network: Network): boolean => {
  try {
    return getAddressInfo(value).network === network
  } catch (_ignoredOnPurpose) {
    return false
  }
}

export const isReusedAddress = (value: string, addressSummary: AddressSummary): boolean =>
  addressSummary[value]?.used === true

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
