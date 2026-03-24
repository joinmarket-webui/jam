import { useMemo } from 'react'
import {
  BookOpenIcon,
  BrushCleaningIcon,
  BugPlayIcon,
  CurlyBracesIcon,
  DownloadIcon,
  HandCoinsIcon,
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
import { routes } from '@/constants/routes'
import { useFeatures } from '@/hooks/useFeatures'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import { DevBadge } from '../dev/DevBadge'

export function AppSidebar({ side }: Pick<React.ComponentProps<typeof Sidebar>, 'side'>) {
  const { t } = useTranslation()
  const { toggleSidebar } = useSidebar()

  const { enabled: isDeveloperMode } = useDeveloperMode()

  const { isFeatureEnabled } = useFeatures()
  const mainItems = useMemo(
    () => [
      {
        title: /*TODO: i18n t('sidebar.item_home.label')*/ 'Home',
        url: routes.home,
        icon: WalletIcon,
      },
      {
        title: /*TODO: i18n t('sidebar.item_earn.label')*/ t('navbar.tab_receive'),
        url: routes.receive,
        icon: DownloadIcon,
      },
      {
        title: /*TODO: i18n t('sidebar.item_earn.label')*/ t('navbar.tab_send'),
        url: routes.send,
        icon: UploadIcon,
      },
      {
        title: /*TODO: i18n t('sidebar.item_earn.label')*/ t('navbar.tab_earn'),
        url: routes.earn,
        icon: HandCoinsIcon,
        subitems: [
          {
            title: /*TODO: i18n t('sidebar.item_earn_report.label')*/ 'Earn Report',
            url: routes.earnReport,
            icon: NotebookTabsIcon,
          },
        ],
      },
      {
        title: /*TODO: i18n t('sidebar.item_earn.label')*/ t('navbar.tab_sweep'),
        url: routes.sweep,
        icon: BrushCleaningIcon,
      },
      {
        title: /*TODO: i18n t('sidebar.item_orderbook.label')*/ 'Orderbook',
        url: routes.orderbook,
        icon: BookOpenIcon,
      },
      {
        title: /*TODO: i18n t('sidebar.item_jars.label')*/ 'Jars',
        url: routes.walletJarsDetails,
        icon: MilkIcon,
      },
    ],
    [t],
  )

  const settingsItems = useMemo(
    () => [
      {
        title: /*TODO: i18n t('sidebar.item_tour.label')*/ 'Tour',
        url: routes.home,
        icon: SparklesIcon,
        onClick: () => {
          toggleSidebar()
          window.dispatchEvent(new CustomEvent(POST_LOGIN_TOUR_EVENT))
        },
      },
      {
        title: /*TODO: i18n t('sidebar.item_rescan.label')*/ t('settings.rescan_chain'),
        url: routes.rescan,
        icon: PackageSearchIcon,
      },
      ...(!isFeatureEnabled('logs')
        ? []
        : [
            {
              title: /*TODO: i18n t('sidebar.item_settings.label')*/ t('settings.show_logs'),
              url: routes.logs,
              icon: LogsIcon,
            },
          ]),
    ],
    [t, isFeatureEnabled, toggleSidebar],
  )

  const devItems = useMemo(
    () =>
      !isDevMode() || !isDeveloperMode
        ? []
        : [
            ...(!isDebugFeatureEnabled('devPage')
              ? []
              : [
                  {
                    title: 'Dev Page',
                    url: routes.__dev,
                    icon: TerminalIcon,
                  },
                ]),
            ...(!isDebugFeatureEnabled('devSetupPage')
              ? []
              : [
                  {
                    title: 'Dev Setup',
                    url: routes.__devSetup,
                    icon: ServerIcon,
                  },
                ]),
            ...(!isDebugFeatureEnabled('devErrorExamplePage')
              ? []
              : [
                  {
                    title: 'Example Error Page',
                    url: routes.__devErrorExample,
                    icon: BugPlayIcon,
                  },
                ]),
          ],
    [isDeveloperMode],
  )

  return (
    <Sidebar side={side} variant="sidebar" collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {/*TODO: i18n t('sidebar.title')*/}
            {t('navbar.title')}
          </SidebarGroupLabel>
          <SidebarGroupAction className="cursor-pointer" title={t('global.close')} onClick={() => toggleSidebar()}>
            <XIcon />
            <span className="sr-only">{t('global.close')}</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild title={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.subitems?.length && (
                    <SidebarMenuSub>
                      {item.subitems?.map((subitem) => (
                        <SidebarMenuSubItem key={subitem.title}>
                          <SidebarMenuSubButton asChild title={subitem.title}>
                            <Link to={subitem.url}>
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
                    {/*TODO: i18n t('sidebar.item_settings.label')*/}
                    <span>{t('navbar.menu_mobile_settings')}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {settingsItems.map((item) => (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton asChild title={item.title}>
                        <Link to={item.url} onClick={item.onClick}>
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
                        <SidebarMenuSubButton asChild title={item.title}>
                          <Link to={item.url}>
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
