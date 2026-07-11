import type React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from './sidebar'

const mocks = vi.hoisted(() => ({
  isMobile: false,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mocks.isMobile,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-open={String(open)}>{children}</div>
  ),
  SheetContent: ({ children, side }: { children: React.ReactNode; side?: string }) => (
    <div data-side={side}>{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipContent: ({ children, hidden }: { children: React.ReactNode; hidden?: boolean }) => (
    <span hidden={hidden}>{children}</span>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const SidebarFixture = () => (
  <SidebarProvider defaultOpen>
    <Sidebar side="left" variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarInput aria-label="Search menu" />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupAction aria-label="Add item">+</SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dashboard tooltip" isActive size="lg" variant="outline">
                  <span>Dashboard</span>
                </SidebarMenuButton>
                <SidebarMenuAction aria-label="More actions" showOnHover>
                  ...
                </SidebarMenuAction>
                <SidebarMenuBadge>3</SidebarMenuBadge>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton href="#child" isActive size="sm">
                      Child
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>Footer</SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarTrigger side="left" />
    <SidebarInset>Main content</SidebarInset>
  </SidebarProvider>
)

describe('sidebar components', () => {
  beforeEach(() => {
    mocks.isMobile = false
    document.cookie = 'sidebar_state=; Max-Age=0; path=/'
  })

  it('renders desktop sidebar parts and toggles collapsed state', async () => {
    const user = userEvent.setup()
    const { container } = render(<SidebarFixture />)

    const sidebar = container.querySelector('[data-slot="sidebar"]')
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Dashboard tooltip')).toBeInTheDocument()
    expect(screen.getByLabelText('Search menu')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'sidebar.button_toggle' })[0])
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
    expect(document.cookie).toContain('sidebar_state=false')

    await user.keyboard('{Control>}b{/Control}')
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
  })

  it('supports mobile and non-collapsible variants', async () => {
    const user = userEvent.setup()
    mocks.isMobile = true
    const { container, rerender } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar side="right">Mobile body</Sidebar>
        <SidebarTrigger side="right" />
      </SidebarProvider>,
    )

    expect(container.querySelector('[data-open="false"]')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'sidebar.button_toggle' }))
    expect(container.querySelector('[data-open="true"]')).toBeInTheDocument()
    expect(screen.getByText('Mobile body')).toBeInTheDocument()

    mocks.isMobile = false
    rerender(
      <SidebarProvider>
        <Sidebar collapsible="none">Always visible</Sidebar>
      </SidebarProvider>,
    )
    expect(screen.getByText('Always visible')).toBeInTheDocument()
  })

  it('supports controlled open state and rejects missing providers', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <SidebarTrigger side="left" />
      </SidebarProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'sidebar.button_toggle' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<SidebarTrigger side="left" />)).toThrow('useSidebar must be used within a SidebarProvider.')
    consoleErrorSpy.mockRestore()
  })
})
