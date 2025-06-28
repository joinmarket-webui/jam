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
  Github,
  ExternalLink,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useDisplayMode } from '@/hooks/useDisplayMode'
import { LanguageSelector } from './LanguageSelector'
import { SettingItem } from './SettingsItem'

export const Settings = () => {
  const { resolvedTheme, setTheme } = useTheme()
  const { displayMode, toggleDisplayMode } = useDisplayMode()
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
    // TODO: Implement chain rescan
    console.log('Rescan chain')
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
        <h1 className="m-5 text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      {/* Display Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingItem
            icon={hideBalance ? EyeOff : Eye}
            title="Hide balance"
            action={handleHideBalance}
            isToggle={true}
            isActive={hideBalance}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Bitcoin}
            title="Display amounts in sats"
            action={toggleDisplayMode}
            isToggle={true}
            isActive={displayMode === 'sats'}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={resolvedTheme === 'dark' ? Sun : Moon}
            title={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
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
          <CardTitle className="text-base font-medium">Market</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingItem
            icon={DollarSign}
            title="Adjust fee limits"
            action={handleAdjustFeeLimits}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
        </CardContent>
      </Card>

      {/* Wallet Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingItem
            icon={Key}
            title="Show seed phrase"
            action={handleShowSeedPhrase}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Unlock}
            title="Lock wallet"
            action={handleLockWallet}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={RotateCcw}
            title="Switch wallet"
            action={handleSwitchWallet}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={RefreshCw}
            title="Rescan chain"
            action={handleRescanChain}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={FileText}
            title="Show logs"
            action={handleShowLogs}
            tooltip="Feature not yet implemented"
            disabled={true}
          />
        </CardContent>
      </Card>

      {/* Community Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Community</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div
            className="hover:bg-muted/50 -mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2"
            onClick={() => window.open('https://matrix.to/#/%23jam:bitcoin.kyoto', '_blank')}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg">
                <img src="/matrix-logo.png" alt="Matrix" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Matrix</p>
              </div>
            </div>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </div>
          <Separator className="opacity-50" />
          <div
            className="hover:bg-muted/50 -mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2"
            onClick={() => window.open('https://t.me/JoinMarketWebUI', '_blank')}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg">
                <img src="/telegram-logo.png" alt="Telegram" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Telegram</p>
              </div>
            </div>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </div>
        </CardContent>
      </Card>

      {/* Development & Documentation */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Development & Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <SettingItem
            icon={Book}
            title="Documentation"
            action={() => window.open('https://jamdocs.org', '_blank')}
            clickable={true}
            external={true}
          />
          <Separator className="opacity-50" />
          <SettingItem
            icon={Github}
            title="GitHub"
            action={() => window.open('https://github.com/joinmarket-webui/jam', '_blank')}
            clickable={true}
            external={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
