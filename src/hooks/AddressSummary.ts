import { useMemo } from 'react'
import { WalletInfo, AddressStatus } from '../context/WalletContext'
import { BitcoinAddress } from '../libs/JmWalletApi'

type AddressInfo = {
  status: AddressStatus
  address: BitcoinAddress
}

type AddressSummary = {
  [key: BitcoinAddress]: AddressInfo
}

const useAddressSummary = (currentWalletInfo: WalletInfo | null): AddressSummary | null => {
  return useMemo(() => {
    if (!currentWalletInfo) {
      return null
    }

    const accounts = currentWalletInfo.data.display.walletinfo.accounts
    return accounts
      .flatMap((it) => it.branches)
      .flatMap((it) => it.entries)
      .reduce((acc, { address, status }) => {
        acc[address] = { address, status }
        return acc
      }, {} as AddressSummary)
  }, [currentWalletInfo])
}

export { useAddressSummary, AddressSummary, AddressInfo }
