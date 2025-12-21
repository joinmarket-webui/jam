import { useState } from 'react'
import { lockwalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import {
  EyeIcon,
  EyeOffIcon,
  SunIcon,
  MoonIcon,
  DollarSignIcon,
  KeyIcon,
  UnlockIcon,
  RotateCcwIcon,
  RefreshCwIcon,
  FileTextIcon,
  BookIcon,
  ExternalLinkIcon,
  TerminalIcon,
  KeyRoundIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { BtcSymbol, SatSymbol } from '@/components/CurrencySymbol'
import { useJamDisplayContext } from '@/components/layout/display-mode-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { isDebugFeatureEnabled, isDevMode } from '@/constants/debugFeatures'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeatures } from '@/hooks/useFeatures'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { AccountXpubsDialog } from './AccountXpubsDialog'
import { FeeLimitDialog } from './FeeLimitDialog'
import { LanguageSelector } from './LanguageSelector'
import { SeedPhraseDialog } from './SeedPhraseDialog'
import { SettingItem, SettingsLink, SettingSwitch } from './SettingsItem'

interface SettingPageProps {
  walletFileName: WalletFileName
}

export const SettingsPage = ({ walletFileName }: SettingPageProps) => {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const { currency, toggleCurrencyUnit, isPrivate, togglePrivacyMode } = useJamDisplayContext()
  const jamSettings = useStore(jamSettingsStore)

  const [showSeedDialog, setShowSeedDialog] = useState(false)
  const [showXpubsDialog, setShowXpubsDialog] = useState(false)
  const [showFeeLimitDialog, setShowFeeLimitDialog] = useState(false)
  const navigate = useNavigate()
  const client = useApiClient()
  const hashedPassword = useStore(authStore, (state) => state.state?.hashed_password)
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
      await navigate(routes.login)
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error ? (error.message ?? '') : '') || t('global.errors.reason_unknown')
      toast.error(t('global.errors.error_reloading_wallet_failed', { reason: errorMessage }))
      console.error('Failed to lock wallet:', error)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('navbar.menu_mobile_settings')}</h1>

      {/* Display Settings */}
      <Card className="mt-3 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_display')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingSwitch
            icon={isPrivate ? EyeIcon : EyeOffIcon}
            title={t(isPrivate ? 'settings.show_balance' : 'settings.hide_balance')}
            checked={isPrivate}
            onCheckedChange={togglePrivacyMode}
            displayToggle={false}
          />
          <Separator className="opacity-50" />
          <SettingSwitch
            renderIcon={({ className }) =>
              currency === 'btc' ? <BtcSymbol className={className} /> : <SatSymbol className={className} />
            }
            title={t(currency === 'btc' ? 'settings.use_btc' : 'settings.use_sats')}
            checked={currency === 'btc'}
            onCheckedChange={toggleCurrencyUnit}
            displayToggle={false}
          />
          <Separator className="opacity-50" />
          <SettingSwitch
            icon={resolvedTheme === 'dark' ? SunIcon : MoonIcon}
            title={resolvedTheme === 'dark' ? t('settings.use_light_theme') : t('settings.use_dark_theme')}
            checked={resolvedTheme === 'dark'}
            onCheckedChange={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            displayToggle={false}
          />
          <Separator className="opacity-50" />
          <LanguageSelector />
          <Separator className="opacity-50" />
          <SettingSwitch
            icon={KeyRoundIcon}
            title={t('settings.power_user_mode')}
            checked={jamSettings.state.powerUserMode}
            onCheckedChange={(checked) => jamSettings.update({ powerUserMode: checked })}
            displayToggle={false}
          />
        </CardContent>
      </Card>

      {/* Market Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_market')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingItem
            icon={DollarSignIcon}
            title={t('settings.show_fee_config')}
            action={async () => {
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
            icon={KeyIcon}
            title={t('settings.show_seed')}
            action={async () => setShowSeedDialog(true)}
            disabled={hashedPassword === undefined}
          />
          {jamSettings.state.powerUserMode && (
            <>
              <Separator className="opacity-50" />
              <SettingItem
                icon={KeyRoundIcon}
                title={t('settings.show_xpubs')}
                action={async () => setShowXpubsDialog(true)}
                disabled={hashedPassword === undefined}
              />
            </>
          )}
          <Separator className="opacity-50" />
          <SettingItem
            icon={UnlockIcon}
            title={t('settings.button_lock_wallet')}
            action={handleLockWallet}
            disabled={lockWalletQuery.isFetching}
          />
          <Separator className="opacity-50" />
          <SettingsLink icon={RotateCcwIcon} title={t('settings.button_switch_wallet')} to={routes.switchWallet} />
          <Separator className="opacity-50" />
          <SettingsLink icon={RefreshCwIcon} title={t('settings.rescan_chain')} to={routes.rescan} />
          <Separator className="opacity-50" />
          <SettingsLink
            icon={FileTextIcon}
            title={t('settings.show_logs')}
            to={routes.logs}
            disabled={!isLogsEnabled}
          />
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
            <ExternalLinkIcon className="text-muted-foreground h-3 w-3" />
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
            <ExternalLinkIcon className="text-muted-foreground h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {/* Development & Documentation */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_dev')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingsLink icon={BookIcon} title={t('settings.documentation')} to="https://jamdocs.org" external={true} />
          <Separator className="opacity-50" />
          <SettingsLink
            renderIcon={({ className }) => <GitHubIcon className={className} />}
            title={t('settings.github')}
            to="https://github.com/joinmarket-webui/jam"
            external={true}
          />
          {isDevMode() && (
            <>
              <Separator className="opacity-50" />
              <SettingSwitch
                icon={TerminalIcon}
                title="Enable developer mode"
                disabled={!isDevMode()}
                checked={jamSettings.state.developerMode}
                onCheckedChange={(checked) => {
                  jamSettings.update({ developerMode: checked })
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {jamSettings.state.developerMode && (
        <>
          {/* Developer Mode */}
          <Card className="animate-slide-up border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">Developer Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <SettingsLink
                icon={TerminalIcon}
                title="Dev page"
                to={routes.__dev}
                disabled={!isDebugFeatureEnabled('devPage')}
              />
              <Separator className="opacity-50" />
            </CardContent>
          </Card>
        </>
      )}

      <SeedPhraseDialog walletFileName={walletFileName} open={showSeedDialog} onOpenChange={setShowSeedDialog} />
      <AccountXpubsDialog walletFileName={walletFileName} open={showXpubsDialog} onOpenChange={setShowXpubsDialog} />
      <FeeLimitDialog walletFileName={walletFileName} open={showFeeLimitDialog} onOpenChange={setShowFeeLimitDialog} />
    </div>
  )
}

const GitHubIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)
