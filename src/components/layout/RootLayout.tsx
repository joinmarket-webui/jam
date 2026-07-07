import { lazy, Suspense, type PropsWithChildren } from 'react'
import { APP_DISPLAY_VERSION } from '@/constants/jam'

const BetaInfoHeader = lazy(() => import('@/components/layout/header/BetaInfoHeader'))

const rawVersionLowercase = APP_DISPLAY_VERSION.raw?.toLowerCase() || ''
const displayBetaHeader = ['alpha', 'beta', 'rc', 'dev', 'snapshot'].some((it) => rawVersionLowercase.includes(it))

export function RootLayout({ children }: PropsWithChildren<unknown>) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {displayBetaHeader ? (
        <Suspense fallback={null}>
          <BetaInfoHeader />
        </Suspense>
      ) : null}
      <div className="flex flex-1 flex-col overflow-auto">{children}</div>
    </div>
  )
}
