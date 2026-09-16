import { useMemo } from 'react'
import {
  BookOpenIcon,
  BrushCleaningIcon,
  BugPlayIcon,
  CurlyBracesIcon,
  DownloadIcon,
  HandCoinsIcon,
  HistoryIcon,
  LogsIcon,
  MilkIcon,
  NotebookTabsIcon,
  PackageSearchIcon,
  ServerIcon,
  SettingsIcon,
  SparklesIcon,
  TerminalIcon,
  UploadIcon,
  WalletIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { useSidebar } from '@/components/ui/use-sidebar'
import { isDebugFeatureEnabled, isDevMode } from '@/constants/debugFeatures'
import { POST_LOGIN_TOUR_EVENT } from '@/constants/onboarding'
import { routes, type Route } from '@/constants/routes'
import { useFeatures } from '@/hooks/useFeatures'
import { useDeveloperMode, usePreviewFeatures } from '@/store/jamSettingsStore'
import { DevBadge } from '../dev/DevBadge'
import { Badge } from '../ui/badge'

type JamMenuItem = {
  icon: LucideIcon
  title: string
  url: Route
  onClick?: () => void
  preview?: boolean
  experimental?: boolean
  subitems?: JamMenuItem[]
}

export function AppSidebar({ side }: Pick<React.ComponentProps<typeof Sidebar>, 'side'>) {
  const { t } = useTranslation()
  const { toggleSidebar } = useSidebar()

  const { enabled: isDeveloperMode } = useDeveloperMode()
  const previewFeatures = usePreviewFeatures()

  const { isFeatureEnabled } = useFeatures()
  const mainItems = useMemo<JamMenuItem[]>(
    () => [
      {
        title: t('sidebar.item_home.label'),
        url: 'home',
        icon: WalletIcon,
      },
      {
        title: t('navbar.tab_receive'),
        url: 'receive',
        icon: DownloadIcon,
      },
      {
        title: t('navbar.tab_send'),
        url: 'send',
        icon: UploadIcon,
      },
      {
        title: t('navbar.tab_earn'),
        url: 'earn',
        icon: HandCoinsIcon,
        subitems: [
          {
            title: t('sidebar.item_earn_report.label'),
            url: 'earnReport',
            icon: NotebookTabsIcon,
          },
        ],
      },
      {
        title: t('navbar.tab_sweep'),
        url: 'sweep',
        icon: BrushCleaningIcon,
      },
      {
        title: t('sidebar.item_orderbook.label'),
        url: 'orderbook',
        icon: BookOpenIcon,
      },
      {
        title: t('sidebar.item_jars.label'),
        url: 'walletJarsDetails',
        icon: MilkIcon,
      },
      ...((previewFeatures?.['tx-history'] !== true
        ? []
        : [
            {
              title: t('sidebar.item_history.label'),
              url: 'txHistory',
              icon: HistoryIcon,
              preview: true,
            },
          ]) as JamMenuItem[]),
    ],
    [t, previewFeatures],
  )

  const settingsItems = useMemo<JamMenuItem[]>(
    () => [
      {
        title: t('sidebar.item_tour.label'),
        url: 'home',
        icon: SparklesIcon,
        onClick: () => {
          toggleSidebar()
          window.dispatchEvent(new CustomEvent(POST_LOGIN_TOUR_EVENT))
        },
      },
      {
        title: t('sidebar.item_rescan.label'),
        url: 'rescan',
        icon: PackageSearchIcon,
        experimental: true,
      },
      ...((!isFeatureEnabled('logs')
        ? []
        : [
            {
              title: t('sidebar.item_logs.label'),
              url: routes.logs,
              icon: LogsIcon,
            },
          ]) as JamMenuItem[]),
    ],
    [t, isFeatureEnabled, toggleSidebar],
  )

  const devItems = useMemo<JamMenuItem[]>(
    () =>
      !isDevMode() || !isDeveloperMode
        ? []
        : [
            ...((!isDebugFeatureEnabled('devPage')
              ? []
              : [
                  {
                    title: 'Dev Page',
                    url: routes.__dev,
                    icon: TerminalIcon,
                  },
                ]) as JamMenuItem[]),
            ...((!isDebugFeatureEnabled('devSetupPage')
              ? []
              : [
                  {
                    title: 'Dev Setup',
                    url: routes.__devSetup,
                    icon: ServerIcon,
                  },
                ]) as JamMenuItem[]),
            ...((!isDebugFeatureEnabled('devErrorExamplePage')
              ? []
              : [
                  {
                    title: 'Example Error Page',
                    url: routes.__devErrorExample,
                    icon: BugPlayIcon,
                  },
                ]) as JamMenuItem[]),
          ],
    [isDeveloperMode],
  )

  return (
    <Sidebar side={side} variant="sidebar" collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.title')}</SidebarGroupLabel>
          <SidebarGroupAction className="cursor-pointer" title={t('global.close')} onClick={() => toggleSidebar()}>
            <XIcon />
            <span className="sr-only">{t('global.close')}</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild title={item.title}>
                    <Link to={routes[item.url]}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.preview ? <Badge variant="muted">{t('global.preview')}</Badge> : null}
                      {item.experimental ? <Badge variant="muted">{t('global.experimental')}</Badge> : null}
                    </Link>
                  </SidebarMenuButton>
                  {item.subitems?.length && (
                    <SidebarMenuSub>
                      {item.subitems?.map((subitem) => (
                        <SidebarMenuSubItem key={subitem.title}>
                          <SidebarMenuSubButton asChild title={subitem.title}>
                            <Link to={routes[subitem.url]}>
                              <subitem.icon />
                              <span>{subitem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to={routes.settings}>
                    <SettingsIcon />
                    <span>{t('sidebar.item_settings.label')}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {settingsItems.map((item) => (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton asChild title={item.title}>
                        <Link to={routes[item.url]} onClick={item.onClick}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {devItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <div>
                      <CurlyBracesIcon />
                      <span>Development</span>
                      <DevBadge />
                    </div>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {devItems.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild title={item.title} size="sm">
                          <Link to={routes[item.url]}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : undefined}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem></SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
