import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Eye,
  EyeOff,
  Bitcoin,
  Sun,
  Moon,
  DollarSign,
  Key,
  Unlock,
  RotateCcw,
  RefreshCw,
  FileText,
  Book,
  // TODO: Remove depricated imports(company logos) from lucide react and use https://simpleicons.org directly
  Github,
  ExternalLink,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeatures } from '@/hooks/useFeatures'
import { lockwalletOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { useJamDisplayContext } from '../layout/display-mode-context'
import { FeeLimitDialog } from './FeeLimitDialog'
import { LanguageSelector } from './LanguageSelector'
import { SeedPhraseDialog } from './SeedPhraseDialog'
import { SettingItem } from './SettingsItem'

interface SettingProps {
  walletFileName: WalletFileName
}

export const Settings = ({ walletFileName }: SettingProps) => {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const { currency, toggleCurrencyUnit, isPrivate, togglePrivacyMode } = useJamDisplayContext()

  const [showSeedDialog, setShowSeedDialog] = useState(false)
  const [showFeeLimitDialog, setShowFeeLimitDialog] = useState(false)
  const navigate = useNavigate()
  const client = useApiClient()
  const hashedSecret = useStore(authStore, (state) => state.state?.hashed_password)
  const { isLogsEnabled } = useFeatures()

  const lockWalletQuery = useQuery({
    ...lockwalletOptions({
      client,
      path: { walletname: walletFileName },
    }),
    enabled: false,
  })

  const handleLockWallet = async () => {
    try {
      await lockWalletQuery.refetch()
      authStore.getState().clear()
      toast.success(t('wallets.wallet_preview.alert_wallet_locked_successfully', { walletName: walletFileName }))
      navigate('/login')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(t('global.errors.error_reloading_wallet_failed', { reason: errorMessage }))
      console.error('Failed to lock wallet:', error)
    }
  }

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('navbar.menu_mobile_settings')}</h1>

      {/* Display Settings */}
      <Card className="mt-3 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_display')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingItem
            icon={isPrivate ? Eye : EyeOff}
            title={t(isPrivate ? 'settings.show_balance' : 'settings.hide_balance')}
            action={togglePrivacyMode}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Bitcoin}
            title={t(currency === 'btc' ? 'settings.use_btc' : 'settings.use_sats')}
            action={toggleCurrencyUnit}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={resolvedTheme === 'dark' ? Sun : Moon}
            title={resolvedTheme === 'dark' ? t('settings.use_light_theme') : t('settings.use_dark_theme')}
            action={toggleTheme}
          />
          <Separator className="opacity-50" />
          <LanguageSelector />
        </CardContent>
      </Card>

      {/* Market Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_market')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingItem
            icon={DollarSign}
            title={t('settings.show_fee_config')}
            action={() => {
              setShowFeeLimitDialog(true)
            }}
          />
        </CardContent>
      </Card>

      {/* Wallet Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_wallet')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingItem
            icon={Key}
            title={t('settings.show_seed')}
            action={() => setShowSeedDialog(true)}
            disabled={hashedSecret === undefined}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Unlock}
            title={t('settings.button_lock_wallet')}
            action={handleLockWallet}
            disabled={lockWalletQuery.isFetching}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={RotateCcw}
            title={t('settings.button_switch_wallet')}
            action={() => {
              navigate('/switch-wallet')
            }}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={RefreshCw}
            title={t('settings.rescan_chain')}
            action={() => {
              navigate('/settings/rescan')
            }}
          />
          {isLogsEnabled && (
            <>
              <Separator className="opacity-50" />
              <SettingItem
                icon={FileText}
                title={t('settings.show_logs')}
                action={() => {
                  navigate('/logs')
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Community Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_community')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <a
            href="https://matrix.to/#/%23jam:bitcoin.kyoto"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:bg-muted/50 -mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-inherit no-underline"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg">
                <img src="/matrix-logo.png" alt="Matrix" className="light:invert-0 h-4 w-4 invert" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('settings.matrix')}</p>
              </div>
            </div>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </a>
          <Separator className="opacity-50" />
          <a
            href="https://t.me/JoinMarketWebUI"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:bg-muted/50 -mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-inherit no-underline"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg">
                <img src="/telegram-logo.png" alt="Telegram" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('settings.telegram')}</p>
              </div>
            </div>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {/* Development & Documentation */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_dev')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingItem
            icon={Book}
            title={t('settings.documentation')}
            action={() => {
              window.open('https://jamdocs.org', '_blank', 'noreferrer,noopener')
            }}
            external={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Github}
            title={t('settings.github')}
            action={() => {
              window.open('https://github.com/joinmarket-webui/jam', '_blank', 'noreferrer,noopener')
            }}
            external={true}
          />
        </CardContent>
      </Card>

      <SeedPhraseDialog walletFileName={walletFileName} open={showSeedDialog} onOpenChange={setShowSeedDialog} />
      <FeeLimitDialog walletFileName={walletFileName} open={showFeeLimitDialog} onOpenChange={setShowFeeLimitDialog} />
    </div>
  )
}
