import { useMemo } from 'react'
import {
  BookOpenIcon,
  BrushCleaningIcon,
  DownloadIcon,
  HandCoinsIcon,
  LogsIcon,
  PackageSearchIcon,
  SettingsIcon,
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
import { routes } from '@/constants/routes'
import { useFeatures } from '@/hooks/useFeatures'

export function AppSidebar({ side }: Pick<React.ComponentProps<typeof Sidebar>, 'side'>) {
  const { t } = useTranslation()
  const { toggleSidebar } = useSidebar()

  const { isLogsEnabled } = useFeatures()
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
    ],
    [t],
  )

  const settingsItems = useMemo(
    () => [
      {
        title: /*TODO: i18n t('sidebar.item_rescan.label')*/ t('settings.rescan_chain'),
        url: routes.rescan,
        icon: PackageSearchIcon,
      },
      ...(!isLogsEnabled
        ? []
        : [
            {
              title: /*TODO: i18n t('sidebar.item_settings.label')*/ t('settings.show_logs'),
              url: routes.logs,
              icon: LogsIcon,
            },
          ]),
    ],
    [t, isLogsEnabled],
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
                    <span>{t('navbar.menu_mobile_settings')}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {settingsItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem></SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
