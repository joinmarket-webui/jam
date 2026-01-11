import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from 'zustand'
import { FeeConfigTestComponent } from '@/components/dev/FeeConfigTestComponent'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { Button } from '@/components/ui/button'
import PageTitle from '@/components/ui/jam/PageTitle'
import { routes } from '@/constants/routes'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmConfigStore } from '@/store/jmConfigStore'
import { jmSessionStore } from '@/store/jmSessionStore'

interface DevPageProps {
  walletFileName?: WalletFileName
}

export default function DevPage({ walletFileName }: DevPageProps) {
  const authState = useStore(authStore, (state) => state.state)
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)
  const jamSettingsState = useStore(jamSettingsStore, (state) => state.state)
  const jmConfigStoreState = useStore(jmConfigStore, (state) => state.state)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  const feeConfig = useFeeConfigValidation({ walletFileName: walletFileName ?? 'None.jmdat' })

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <PageTitle title="Development" subtitle="Development specific information" />

      <div className="my-4 flex flex-col gap-3">
        <div>
          <h5 className="text-xl font-bold">Links</h5>
          <div className="my-2">
            <Link to={routes.__devErrorExample} className="font-semibold underline hover:no-underline">
              Error Example Page
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">import.meta.env:</code>
        <pre className="text-xs">{JSON.stringify(import.meta.env, null, 2)}</pre>
      </div>
      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(authStore):</code>
        <pre className="text-xs">{JSON.stringify(authState, null, 2)}</pre>
      </div>
      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jmSessionStore):</code>
        <pre className="text-xs">{JSON.stringify(jmSessionState, null, 2)}</pre>
      </div>
      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jmConfigStore):</code>
        <pre className="text-xs">{JSON.stringify(jmConfigStoreState, null, 2)}</pre>
      </div>
      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jamSettingsStore):</code>
        <pre className="text-xs">{JSON.stringify(jamSettingsState, null, 2)}</pre>
      </div>

      {feeConfig && walletFileName && (
        <div className="mt-8">
          <h3 className="my-2 text-xl font-semibold tracking-tight">Fees</h3>
          <FeeConfigTestComponent walletFileName={walletFileName} />

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
        </div>
      )}
    </div>
  )
}
