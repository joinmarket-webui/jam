import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from 'zustand'
import { FeeConfigTestComponent } from '@/components/dev/FeeConfigTestComponent'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { Button } from '@/components/ui/button'
import PageTitle from '@/components/ui/jam/PageTitle'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { routes } from '@/constants/routes'
import { useJars, useWalletBalanceSummary } from '@/context/JamWalletInfoContext'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmConfigStore } from '@/store/jmConfigStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { DevBadge } from './DevBadge'

interface DevConfigTabContentProps {
  walletFileName?: WalletFileName
}

function DevConfigTabContent({ walletFileName }: DevConfigTabContentProps) {
  const authState = useStore(authStore, (state) => state.state)
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const jamSettingsState = useStore(jamSettingsStore, (state) => state.state)
  const jmConfigStoreState = useStore(jmConfigStore, (state) => state.state)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  const feeConfig = useFeeConfigValidation({ walletFileName: walletFileName ?? 'None.jmdat' })

  return (
    <div className="flex flex-col gap-4">
      <h5 className="text-xl font-bold">Config</h5>
      <div className="overflow-scroll">
        <code className="light:text-red-700 text-red-800">import.meta.env:</code>
        <pre className="text-xs">{JSON.stringify(import.meta.env, null, 2)}</pre>
      </div>
      <div className="overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(authStore):</code>
        <pre className="text-xs">{JSON.stringify(authState, null, 2)}</pre>
      </div>
      <div className="overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jmSessionStore):</code>
        <pre className="text-xs">{JSON.stringify(jmSession, null, 2)}</pre>
      </div>
      <div className="overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jmConfigStore):</code>
        <pre className="text-xs">{JSON.stringify(jmConfigStoreState, null, 2)}</pre>
      </div>
      <div className="overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jamSettingsStore):</code>
        <pre className="text-xs">{JSON.stringify(jamSettingsState, null, 2)}</pre>
      </div>

      {feeConfig && walletFileName && (
        <div className="">
          <h3 className="text-xl font-semibold tracking-tight">Fees</h3>

          <FeeLimitDialog
            open={showFeeConfigDialog}
            onOpenChange={setShowFeeConfigDialog}
            walletFileName={walletFileName}
          />

          <div className="overflow-scroll">
            <code className="light:text-red-700 text-red-800">feeConfig.feeConfigValues:</code>
            <pre className="text-xs">{JSON.stringify(feeConfig.feeConfigValues, null, 2)}</pre>
          </div>
          <div className="overflow-scroll">
            <code className="light:text-red-700 text-red-800">feeConfig.isLoading:</code>
            <pre className="text-xs">{JSON.stringify(feeConfig.isLoading, null, 2)}</pre>
          </div>
          <div className="overflow-scroll">
            <code className="light:text-red-700 text-red-800">feeConfig.maxFeesConfigMissing:</code>
            <pre className="text-xs">{JSON.stringify(feeConfig.maxFeesConfigMissing, null, 2)}</pre>
          </div>
          <Button onClick={() => feeConfig.refetchAll()}>feeConfig.refetchAll()</Button>

          <FeeConfigTestComponent walletFileName={walletFileName} />
        </div>
      )}
    </div>
  )
}

function DevWalletTabContent() {
  const walletBalanceSummary = useWalletBalanceSummary()
  const jars = useJars()

  return (
    <div className="flex flex-col gap-4">
      <h5 className="text-xl font-bold">Wallet</h5>
      <div className="overflow-scroll">
        <code className="light:text-red-700 text-red-800">walletBalanceSummary:</code>
        <pre className="text-xs">{JSON.stringify(walletBalanceSummary, null, 2)}</pre>
      </div>
      <div className="overflow-scroll">
        <code className="light:text-red-700 text-red-800">jars:</code>
        <pre className="text-xs">{JSON.stringify(jars, null, 2)}</pre>
      </div>
    </div>
  )
}

interface DevPageProps {
  walletFileName?: WalletFileName
}

export default function DevPage({ walletFileName }: DevPageProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle
        title={
          <>
            Development <DevBadge />
          </>
        }
        subtitle="Development specific information"
      />

      <Tabs defaultValue="config" className="flex flex-col gap-4">
        <TabsList className="flex items-center gap-2">
          <TabsTrigger value="config" className="cursor-pointer">
            Config
          </TabsTrigger>
          <TabsTrigger value="wallet" className="cursor-pointer">
            Wallet
          </TabsTrigger>
          <TabsTrigger value="links" className="cursor-pointer">
            Links
          </TabsTrigger>
        </TabsList>
        <TabsContent value="config">
          <DevConfigTabContent walletFileName={walletFileName} />
        </TabsContent>
        <TabsContent value="wallet">
          <DevWalletTabContent />
        </TabsContent>
        <TabsContent value="links">
          <div>
            <h5 className="text-xl font-bold">Links</h5>
            <div className="my-2">
              <Link to={routes.__devErrorExample} className="font-semibold underline hover:no-underline">
                Error Example Page
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
