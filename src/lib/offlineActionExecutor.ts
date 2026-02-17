import type { Client } from '@joinmarket-webui/joinmarket-api-ts/client'
import { configsetting, directsend, recoverwallet, rescanblockchain } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import { hashPassword } from '@/lib/hash'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmTxStore, type JmTxInfo } from '@/store/jmTxStore'
import type { OfflineAction } from '@/store/offlineActionQueueStore'

export const executeOfflineAction = async (client: Client, action: OfflineAction): Promise<void> => {
  switch (action.type) {
    case 'send': {
      const { data } = await directsend({
        client,
        throwOnError: true,
        path: {
          walletname: encodeURIComponent(action.payload.walletFileName),
        },
        body: action.payload.request,
      })

      const txInfo = data?.txinfo as JmTxInfo | undefined
      if (txInfo?.txid !== undefined) {
        jmTxStore.getState().add(txInfo)
      }

      return
    }
    case 'import_wallet': {
      const { data } = await recoverwallet({
        client,
        throwOnError: true,
        body: action.payload.request,
      })

      if (!data) {
        throw new Error('Wallet import returned no data.')
      }

      let hashedPassword: string | undefined
      try {
        hashedPassword = await hashPassword(action.payload.request.password, data.walletname as WalletFileName)
      } catch (error) {
        console.warn('Failed to hash password after queued wallet import.', error)
      }

      authStore.getState().update({
        walletFileName: data.walletname as WalletFileName,
        auth: {
          token: data.token,
          refresh_token: data.refresh_token,
        },
        hashed_password: hashedPassword,
      })
      return
    }
    case 'rescan_chain': {
      await rescanblockchain({
        client,
        throwOnError: true,
        path: {
          walletname: encodeURIComponent(action.payload.walletFileName),
          blockheight: action.payload.blockHeight,
        },
      })
      return
    }
    case 'update_fee_settings': {
      for (const update of action.payload.updates) {
        await configsetting({
          client,
          throwOnError: true,
          path: {
            walletname: encodeURIComponent(action.payload.walletFileName),
          },
          body: {
            ...FEE_CONFIG_KEYS[update.key],
            value: update.value,
          },
        })
      }
      return
    }
    default: {
      const exhaustiveTypeCheck: never = action
      throw new Error(`Unsupported offline action: ${JSON.stringify(exhaustiveTypeCheck)}`)
    }
  }
}
