import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import {
  EyeIcon,
  EyeOffIcon,
  SunIcon,
  MoonIcon,
  FileTextIcon,
  BookIcon,
  TerminalIcon,
  PackageSearchIcon,
  LockKeyholeIcon,
  BookKeyIcon,
  FoldHorizontalIcon,
  UnfoldHorizontalIcon,
  KeyRoundIcon,
  HandCoinsIcon,
  SparklesIcon,
  HistoryIcon,
  LanguagesIcon,
  FlaskConicalIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { useStore } from 'zustand'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'
import { LanguageSelector } from '@/components/ui/jam/LanguageSelector'
import PageTitle from '@/components/ui/jam/PageTitle'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { isDebugFeatureEnabled, isDevMode } from '@/constants/debugFeatures'
import { JAM_DOCS_URL, JAM_MATRIX_URL, JAM_REPO_URL, JAM_SEED_MODAL_TIMEOUT, JAM_TELEGRAM_URL } from '@/constants/jam'
import { routes } from '@/constants/routes'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { useFeatures } from '@/hooks/useFeatures'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { cn, type WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { Address } from '../ui/jam/Address'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { AccountXpubsDialog } from './AccountXpubsDialog'
import { SeedPhraseDialog } from './SeedPhraseDialog'
import { SettingsItem, SettingsLink, SettingsSwitch } from './SettingsItem'
import { FeeConfigDialog } from './fees/FeeConfigDialog'

const GitHubIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

type SettingsTab = 'basic' | 'advanced'

interface SettingPageProps {
  walletFileName: WalletFileName
  onLockWallet: (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => Promise<void>
  initialTab?: SettingsTab
}

export const SettingsPage = ({ walletFileName, onLockWallet, initialTab = 'basic' }: SettingPageProps) => {
  const { t } = useTranslation()

  const [tab, setTab] = useState<SettingsTab>(initialTab)

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle title={t('navbar.menu_mobile_settings')}>
        <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTab)}>
          <TabsList>
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageTitle>

      {tab === 'basic' && <SettingsBasicContent walletFileName={walletFileName} onLockWallet={onLockWallet} />}
      {tab === 'advanced' && <SettingsAdvancedContent />}
    </div>
  )
}

export const SettingsBasicContent = ({ walletFileName, onLockWallet }: SettingPageProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const { currency, toggleCurrencyUnit, isPrivate, togglePrivacyMode } = useJamDisplayContext()

  const feeConfigValidation = useFeeConfigValidation({ walletFileName })

  const [showSeedDialog, setShowSeedDialog] = useState(false)
  const [showXpubsDialog, setShowXpubsDialog] = useState(false)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const hashedPassword = useStore(authStore, (state) => state.state?.hashed_password)
  const { isFeatureEnabled } = useFeatures()

  const lockWalletMutation = useMutation({
    mutationFn: async ({ navigate, t }: { navigate: NavigateFunction; t: TFunction<'translation', undefined> }) => {
      return await onLockWallet(navigate, t)
    },
    retry: false,
  })

  return (
    <>
      <FeeConfigDialog
        walletFileName={walletFileName}
        feeConfigValidation={feeConfigValidation}
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
      />

      {hashedPassword && (
        <>
          <SeedPhraseDialog
            hashedPassword={hashedPassword}
            walletFileName={walletFileName}
            open={showSeedDialog}
            onOpenChange={setShowSeedDialog}
            autoCloseTimeout={JAM_SEED_MODAL_TIMEOUT}
          />
          <AccountXpubsDialog
            hashedPassword={hashedPassword}
            walletFileName={walletFileName}
            open={showXpubsDialog}
            onOpenChange={setShowXpubsDialog}
            autoCloseTimeout={JAM_SEED_MODAL_TIMEOUT}
          />
        </>
      )}
      {/* Basic Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_display')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsSwitch
            icon={isPrivate ? EyeIcon : EyeOffIcon}
            title={t(isPrivate ? 'settings.show_balance' : 'settings.hide_balance')}
            checked={isPrivate}
            onCheckedChange={togglePrivacyMode}
            displayToggle={false}
          />
          <Separator className="opacity-50" />
          <SettingsSwitch
            renderIcon={({ className }) => <CurrencySymbol currency={currency} className={className} />}
            title={t(currency === 'btc' ? 'settings.use_btc' : 'settings.use_sats')}
            checked={currency === 'btc'}
            onCheckedChange={toggleCurrencyUnit}
            displayToggle={false}
          />
          <Separator className="opacity-50" />
          <SettingsSwitch
            icon={resolvedTheme === 'dark' ? SunIcon : MoonIcon}
            title={resolvedTheme === 'dark' ? t('settings.use_light_theme') : t('settings.use_dark_theme')}
            checked={resolvedTheme === 'dark'}
            onCheckedChange={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            displayToggle={false}
          />
          <Separator className="opacity-50" />
          <SettingsItem icon={LanguagesIcon} title={t('settings.label_select_language')}>
            <LanguageSelector />
          </SettingsItem>
        </CardContent>
      </Card>

      {/* Basic Market Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_market')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsItem
            icon={HandCoinsIcon}
            title={t('settings.show_fee_config')}
            action={() => setShowFeeConfigDialog(true)}
          />
        </CardContent>
      </Card>

      {/* Basic Wallet Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_wallet')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsItem
            icon={KeyRoundIcon}
            title={t('settings.show_seed')}
            action={() => setShowSeedDialog(true)}
            disabled={hashedPassword === undefined}
          />
          <Separator className="opacity-50" />
          <SettingsItem
            icon={BookKeyIcon}
            title={t('settings.show_xpubs')}
            action={() => setShowXpubsDialog(true)}
            disabled={hashedPassword === undefined}
          />
          <Separator className="opacity-50" />
          <SettingsItem
            renderIcon={({ className }) =>
              lockWalletMutation.isPending ? (
                <Spinner className={className} />
              ) : (
                <LockKeyholeIcon className={className} />
              )
            }
            title={t('settings.button_lock_wallet')}
            action={() => void lockWalletMutation.mutateAsync({ navigate, t })}
            disabled={lockWalletMutation.isPending}
          />
          <Separator className="opacity-50" />
          <SettingsLink icon={PackageSearchIcon} title={t('settings.rescan_chain')} to={routes.rescan} />
          <Separator className="opacity-50" />
          <SettingsLink
            icon={FileTextIcon}
            title={t('settings.show_logs')}
            to={routes.logs}
            disabled={!isFeatureEnabled('logs')}
          />
        </CardContent>
      </Card>

      {/* Basic Community Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_community')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsLink
            renderIcon={({ className }) => (
              <img src="/matrix-logo.png" alt="Matrix" className={cn(className, 'light:invert-0 invert')} />
            )}
            title={t('settings.matrix')}
            to={JAM_MATRIX_URL}
            external={true}
          />
          <SettingsLink
            renderIcon={({ className }) => <img src="/telegram-logo.png" alt="Telegram" className={className} />}
            title={t('settings.telegram')}
            to={JAM_TELEGRAM_URL}
            external={true}
          />
        </CardContent>
      </Card>

      {/* Basic Development & Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_dev')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsLink icon={BookIcon} title={t('settings.documentation')} to={JAM_DOCS_URL} external={true} />
          <Separator className="opacity-50" />
          <SettingsLink
            renderIcon={({ className }) => <GitHubIcon className={className} />}
            title={t('settings.github')}
            to={JAM_REPO_URL}
            external={true}
          />
        </CardContent>
      </Card>
    </>
  )
}

export const SettingsAdvancedContent = () => {
  const { t } = useTranslation()
  const { addressChunkingEnabled, toggleAddressChunking } = useJamDisplayContext()
  const jamSettings = useStore(jamSettingsStore)

  return (
    <>
      {/* Advanced Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_display')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsSwitch
            icon={addressChunkingEnabled === true ? UnfoldHorizontalIcon : FoldHorizontalIcon}
            title={t(
              addressChunkingEnabled === true
                ? 'settings.use_address_chunking_enabled'
                : 'settings.use_address_chunking_disabled',
            )}
            subtitle={
              <>
                Example:{' '}
                <Address
                  value="bc1qabcdefghijklmnopqrstuvwxyz0123456789"
                  chunked={addressChunkingEnabled}
                  copyable={false}
                />
              </>
            }

            checked={addressChunkingEnabled === true}
            onCheckedChange={toggleAddressChunking}
            displayToggle={true}
          />
        </CardContent>
      </Card>

      {/* Advanced Expert Features */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_expert_features')}</CardTitle>
          <CardDescription className="text-xs">
            {/* TODO: i18n */}These are expert settings. Please only change them if you know what you are doing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsSwitch
            icon={SparklesIcon}
            title={/* TODO: i18n */ 'Enable Expert Features'}
            checked={!!jamSettings.state.expertFeatures}
            onCheckedChange={(checked) => {
              jamSettings.update({ expertFeatures: checked ? {} : undefined })
            }}
          />
          <Separator className="opacity-50" />
          <SettingsSwitch
            icon={HandCoinsIcon}
            title={/* TODO: i18n */ 'Custom Earn Fee Values'}
            subtitle={/* TODO: i18n */ 'Be careful! Custom fee values have negative impacts on privacy.'}
            disabled={!jamSettings.state.expertFeatures}
            checked={jamSettings.state.expertFeatures?.['custom-earn-fee-values'] === true}
            onCheckedChange={(checked) => {
              jamSettings.update({
                expertFeatures: {
                  ...jamSettings.state.expertFeatures,
                  'custom-earn-fee-values': checked,
                },
              })
            }}
          />
        </CardContent>
      </Card>

      {/* Advanced Preview Features */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.section_title_preview_features')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsSwitch
            icon={FlaskConicalIcon}
            title={/* TODO: i18n */ 'Enable Feature Preview'}
            disabled={!isDevMode()}
            checked={!!jamSettings.state.previewFeatures}
            onCheckedChange={(checked) => {
              jamSettings.update({ previewFeatures: checked ? {} : undefined })
            }}
          />
          <Separator className="opacity-50" />
          <SettingsSwitch
            icon={HistoryIcon}
            title={/* TODO: i18n */ 'Transaction History (Experimental)'}
            disabled={!jamSettings.state.previewFeatures}
            checked={jamSettings.state.previewFeatures?.['tx-history'] === true}
            onCheckedChange={(checked) => {
              jamSettings.update({
                previewFeatures: {
                  ...jamSettings.state.previewFeatures,
                  'tx-history': checked,
                },
              })
            }}
          />
        </CardContent>
      </Card>

      {/* Advanced Developer Mode */}
      {isDevMode() && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Developer Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsSwitch
                icon={TerminalIcon}
                title="Enable Developer Mode"
                disabled={!isDevMode()}
                checked={jamSettings.state.developerMode}
                onCheckedChange={(checked) => {
                  jamSettings.update({ developerMode: checked })
                }}
              />
              {jamSettings.state.developerMode && (
                <>
                  <Separator className="opacity-50" />
                  <SettingsLink
                    icon={TerminalIcon}
                    title={'Dev page'}
                    to={routes.__dev}
                    disabled={!isDebugFeatureEnabled('devPage')}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
