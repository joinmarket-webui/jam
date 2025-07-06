import { useState } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useJamDisplayContext } from '../layout/display-mode-context'
import { LanguageSelector } from './LanguageSelector'
import { SettingItem } from './SettingsItem'

export const Settings = () => {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const { displayMode, toggleDisplayMode } = useJamDisplayContext()
  const navigate = useNavigate()
  const [hideBalance, setHideBalance] = useState(false)

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const handleHideBalance = () => setHideBalance(!hideBalance)

  const handleShowSeedPhrase = () => {
    // TODO: Implement seed phrase modal
    console.log('Show seed phrase')
  }

  const handleLockWallet = () => {
    // TODO: Implement wallet lock
    console.log('Lock wallet')
  }

  const handleSwitchWallet = () => {
    // TODO: Implement wallet switch
    console.log('Switch wallet')
  }

  const handleRescanChain = () => {
    navigate('/settings/rescan')
  }

  const handleShowLogs = () => {
    // TODO: Implement logs viewer
    console.log('Show logs')
  }

  const handleAdjustFeeLimits = () => {
    // TODO: Implement fee limits adjustment
    console.log('Adjust fee limits')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <div>
        <h1 className="m-5 text-2xl font-semibold tracking-tight">{t('navbar.menu_mobile_settings')}</h1>
      </div>

      {/* Display Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('settings.section_title_display')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingItem
            icon={hideBalance ? EyeOff : Eye}
            title={t('settings.hide_balance')}
            action={handleHideBalance}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Bitcoin}
            title={t(displayMode === 'btc' ? 'settings.use_btc' : 'settings.use_sats')}
            action={toggleDisplayMode}
            clickable={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={resolvedTheme === 'dark' ? Sun : Moon}
            title={resolvedTheme === 'dark' ? t('settings.use_light_theme') : t('settings.use_dark_theme')}
            action={toggleTheme}
            clickable={true}
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
            action={handleAdjustFeeLimits}
            tooltip="Feature not yet implemented"
            disabled={true}
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
            action={handleShowSeedPhrase}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Unlock}
            title={t('settings.button_lock_wallet')}
            action={handleLockWallet}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={RotateCcw}
            title={t('settings.button_switch_wallet')}
            action={handleSwitchWallet}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={RefreshCw}
            title={t('settings.rescan_chain')}
            action={handleRescanChain}
            clickable={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={FileText}
            title={t('settings.show_logs')}
            action={handleShowLogs}
            tooltip="Feature not yet implemented"
            disabled={true}
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
                <img src="/matrix-logo.png" alt="Matrix" className="h-4 w-4" />
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
            clickable={true}
            external={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Github}
            title={t('settings.github')}
            action={() => {
              window.open('https://github.com/joinmarket-webui/jam', '_blank', 'noreferrer,noopener')
            }}
            clickable={true}
            external={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
