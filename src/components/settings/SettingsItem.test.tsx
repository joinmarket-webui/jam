import { render, screen } from '@testing-library/react'
import user from '@testing-library/user-event'
import { KeyRoundIcon } from 'lucide-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsItem, SettingsLink, SettingsSwitch } from './SettingsItem'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  open: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean
    disabled?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <button type="button" disabled={disabled} onClick={() => onCheckedChange?.(!checked)}>
      switch:{String(checked)}
    </button>
  ),
}))

describe('SettingsItem', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.open.mockReset()
  })

  it('renders title and icon', () => {
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" />)

    expect(screen.getByText('settings.show_seed')).toBeInTheDocument()
  })

  it('exposes an actionable row as a button', () => {
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" action={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'settings.show_seed' })).toBeInTheDocument()
  })

  it('does not render a button without an action', () => {
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('is reachable by keyboard', async () => {
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" action={vi.fn()} />)

    await user.tab()

    expect(screen.getByRole('button', { name: 'settings.show_seed' })).toHaveFocus()
  })

  it('triggers the action on Enter', async () => {
    const action = vi.fn()
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" action={action} />)

    await user.tab()
    await user.keyboard('{Enter}')

    expect(action).toHaveBeenCalledOnce()
  })

  it('triggers the action on Space', async () => {
    const action = vi.fn()
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" action={action} />)

    await user.tab()
    await user.keyboard(' ')

    expect(action).toHaveBeenCalledOnce()
  })

  it('triggers the action on click', async () => {
    const action = vi.fn()
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" action={action} />)

    await user.click(screen.getByRole('button', { name: 'settings.show_seed' }))

    expect(action).toHaveBeenCalledOnce()
  })

  it('does not trigger the action while disabled', async () => {
    const action = vi.fn()
    render(<SettingsItem icon={KeyRoundIcon} title="settings.show_seed" action={action} disabled={true} />)

    const item = screen.getByRole('button', { name: 'settings.show_seed' })
    expect(item).toBeDisabled()

    await user.click(item)
    await user.tab()
    await user.keyboard('{Enter}')

    expect(action).not.toHaveBeenCalled()
  })

  it('stays a wrapper when children provide their own control', () => {
    render(
      <SettingsItem icon={KeyRoundIcon} title="settings.show_seed" action={vi.fn()} hasInteractiveChild={true}>
        <button type="button">child-control</button>
      </SettingsItem>,
    )

    // no button is nested inside another button
    expect(screen.queryByRole('button', { name: 'settings.show_seed' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'child-control' })).toBeInTheDocument()
  })
})

describe('SettingsLink', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
  })

  it('navigates internally on Enter', async () => {
    render(<SettingsLink icon={KeyRoundIcon} title="settings.rescan_chain" to="/rescan" />)

    await user.tab()
    await user.keyboard('{Enter}')

    expect(mocks.navigate).toHaveBeenCalledWith('/rescan')
  })

  it('opens external links in a new tab on Enter', async () => {
    vi.stubGlobal('open', mocks.open)
    render(<SettingsLink icon={KeyRoundIcon} title="settings.documentation" to="https://example.org" external={true} />)

    await user.tab()
    await user.keyboard('{Enter}')

    expect(mocks.open).toHaveBeenCalledWith('https://example.org', '_blank', 'noreferrer,noopener')
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})

describe('SettingSwitch', () => {
  it('is keyboard operable via the row when no toggle is displayed', async () => {
    const onCheckedChange = vi.fn()
    render(
      <SettingsSwitch
        icon={KeyRoundIcon}
        title="settings.hide_balance"
        checked={false}
        onCheckedChange={onCheckedChange}
        displayToggle={false}
      />,
    )

    await user.tab()
    await user.keyboard('{Enter}')

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('is keyboard operable via the toggle when one is displayed', async () => {
    const onCheckedChange = vi.fn()
    render(
      <SettingsSwitch
        icon={KeyRoundIcon}
        title="settings.use_address_chunking_enabled"
        checked={false}
        onCheckedChange={onCheckedChange}
        displayToggle={true}
      />,
    )

    await user.tab()
    expect(screen.getByRole('button', { name: 'switch:false' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})
