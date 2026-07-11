import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST_LOGIN_TOUR_EVENT } from '@/constants/onboarding'
import { AppSidebar } from './AppSidebar'

const mocks = vi.hoisted(() => ({
  debugFeatures: new Set<string>(),
  developerMode: false,
  devMode: false,
  logsFeature: false,
  toggleSidebar: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, onClick, to }: { children: ReactNode; onClick?: () => void; to: string }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/use-sidebar', () => ({
  useSidebar: () => ({
    toggleSidebar: mocks.toggleSidebar,
  }),
}))

vi.mock('@/components/ui/sidebar', () => {
  const Slot = ({ children }: { children: ReactNode }) => <div>{children}</div>

  return {
    Sidebar: ({ children, side }: { children: ReactNode; side?: string }) => <aside data-side={side}>{children}</aside>,
    SidebarContent: Slot,
    SidebarFooter: Slot,
    SidebarGroup: Slot,
    SidebarGroupAction: ({
      children,
      onClick,
      title,
    }: {
      children: ReactNode
      onClick?: () => void
      title?: string
    }) => (
      <button title={title} type="button" onClick={onClick}>
        {children}
      </button>
    ),
    SidebarGroupContent: Slot,
    SidebarGroupLabel: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    SidebarMenu: Slot,
    SidebarMenuButton: Slot,
    SidebarMenuItem: Slot,
    SidebarMenuSub: Slot,
    SidebarMenuSubButton: Slot,
    SidebarMenuSubItem: Slot,
  }
})

vi.mock('@/constants/debugFeatures', () => ({
  isDebugFeatureEnabled: (feature: string) => mocks.debugFeatures.has(feature),
  isDevMode: () => mocks.devMode,
}))

vi.mock('@/hooks/useFeatures', () => ({
  useFeatures: () => ({
    isFeatureEnabled: (feature: string) => feature === 'logs' && mocks.logsFeature,
  }),
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: mocks.developerMode }),
}))

vi.mock('../dev/DevBadge', () => ({
  DevBadge: () => <span>dev-badge</span>,
}))

describe('AppSidebar', () => {
  beforeEach(() => {
    mocks.debugFeatures = new Set()
    mocks.developerMode = false
    mocks.devMode = false
    mocks.logsFeature = false
    mocks.toggleSidebar.mockReset()
  })

  it('renders main and settings navigation and dispatches the tour event', () => {
    const onTour = vi.fn()
    window.addEventListener(POST_LOGIN_TOUR_EVENT, onTour)

    render(<AppSidebar side="left" />)

    expect(screen.getByText('sidebar.title')).toBeInTheDocument()
    expect(screen.getByText('sidebar.item_home.label')).toBeInTheDocument()
    expect(screen.getByText('navbar.tab_receive')).toBeInTheDocument()
    expect(screen.getByText('navbar.tab_send')).toBeInTheDocument()
    expect(screen.getByText('navbar.tab_earn')).toBeInTheDocument()
    expect(screen.getByText('sidebar.item_earn_report.label')).toBeInTheDocument()
    expect(screen.getByText('sidebar.item_orderbook.label')).toBeInTheDocument()
    expect(screen.getByText('sidebar.item_settings.label')).toBeInTheDocument()
    expect(screen.getByText('sidebar.item_rescan.label')).toBeInTheDocument()
    expect(screen.queryByText('sidebar.item_logs.label')).not.toBeInTheDocument()
    expect(screen.queryByText('Development')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle('global.close'))
    expect(mocks.toggleSidebar).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('sidebar.item_tour.label'))
    expect(mocks.toggleSidebar).toHaveBeenCalledTimes(2)
    expect(onTour).toHaveBeenCalledTimes(1)

    window.removeEventListener(POST_LOGIN_TOUR_EVENT, onTour)
  })

  it('shows optional logs and developer links when enabled', () => {
    mocks.logsFeature = true
    mocks.devMode = true
    mocks.developerMode = true
    mocks.debugFeatures = new Set(['devPage', 'devSetupPage', 'devErrorExamplePage'])

    render(<AppSidebar side="right" />)

    expect(screen.getByText('sidebar.item_logs.label')).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('Dev Page')).toBeInTheDocument()
    expect(screen.getByText('Dev Setup')).toBeInTheDocument()
    expect(screen.getByText('Example Error Page')).toBeInTheDocument()
    expect(screen.getByText('dev-badge')).toBeInTheDocument()
  })
})
