import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import JarSelectorDialog from '@/components/send/JarSelectorDialog'
import { Button } from '@/components/ui/button'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { BalanceSummary } from '@/lib/balanceSummary'

const mockJars: Jar[] = [
  {
    jarIndex: 0,
    name: 'Apricot',
    color: '#e2b86a',
    balanceSummary: {
      calculatedTotalBalanceInSats: 2500000,
      calculatedAvailableBalanceInSats: 2000000,
      calculatedConfirmedAvailableBalanceInSats: 2000000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 500000,
    },
    utxos: [],
  },
  {
    jarIndex: 1,
    name: 'Blueberry',
    color: '#3b5ba9',
    balanceSummary: {
      calculatedTotalBalanceInSats: 1000000,
      calculatedAvailableBalanceInSats: 1000000,
      calculatedConfirmedAvailableBalanceInSats: 1000000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    utxos: [],
  },
  {
    jarIndex: 2,
    name: 'Cherry',
    color: '#c94f7c',
    balanceSummary: {
      calculatedTotalBalanceInSats: 750000,
      calculatedAvailableBalanceInSats: 500000,
      calculatedConfirmedAvailableBalanceInSats: 500000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 250000,
    },
    utxos: [],
  },
  {
    jarIndex: 3,
    name: 'Date',
    color: '#a67c52',
    balanceSummary: {
      calculatedTotalBalanceInSats: 0,
      calculatedAvailableBalanceInSats: 0,
      calculatedConfirmedAvailableBalanceInSats: 0,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    utxos: [],
  },
  {
    jarIndex: 4,
    name: 'Fig',
    color: '#7c3fa6',
    balanceSummary: {
      calculatedTotalBalanceInSats: 3200000,
      calculatedAvailableBalanceInSats: 3200000,
      calculatedConfirmedAvailableBalanceInSats: 3200000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    utxos: [],
  },
]

const mockWalletBalanceSummary: BalanceSummary = {
  calculatedTotalBalanceInSats: 7450000,
  calculatedAvailableBalanceInSats: 6700000,
  calculatedConfirmedAvailableBalanceInSats: 6700000,
  calculatedAvailableFrozenBalanceInSats: 0,
  calculatedFrozenOrLockedBalanceInSats: 750000,
}

const meta: Meta<typeof JarSelectorDialog> = {
  title: 'Dialog/JarSelectorDialog',
  component: JarSelectorDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <JarSelectorDialog
          {...args}
          open={open}
          onOpenChange={setOpen}
          onConfirm={async (jar) => alert(`Selected jar: #${jar}`)}
        />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof JarSelectorDialog>

export const Default: Story = {
  args: {
    title: 'Select Source Jar',
    subtitle: 'Choose which jar you want to spend coins from.',
    jars: mockJars,
    disabledJars: [],
    walletBalanceSummary: mockWalletBalanceSummary,
  },
}

export const WithDisabledJars: Story = {
  args: {
    title: 'Select Destination Jar',
    subtitle: 'Cannot select the current source jar or empty jars.',
    jars: mockJars,
    disabledJars: [mockJars[0], mockJars[3]],
    walletBalanceSummary: mockWalletBalanceSummary,
  },
}

export const SingleJar: Story = {
  args: {
    title: 'Select Jar',
    jars: [mockJars[1]],
    disabledJars: [],
    walletBalanceSummary: {
      calculatedTotalBalanceInSats: 1000000,
      calculatedAvailableBalanceInSats: 1000000,
      calculatedConfirmedAvailableBalanceInSats: 1000000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
  },
}
