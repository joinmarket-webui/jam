import * as Api from '../../libs/JmWalletApi'
import { t } from 'i18next'
import { LoaderFunctionArgs } from 'react-router-dom'

export const allWalletsLoader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const res = await Api.getWalletAll(request)
    const existingWallets = res.ok ? await res.json() : Api.Helper.throwError(res, t('wallets.error_loading_failed'))
    return { existingWallets }
  } catch (e: any) {
    return { existingWalletsError: e.message }
  }
}

export type AllWalletsLoaderResponse = Awaited<ReturnType<typeof allWalletsLoader>>
