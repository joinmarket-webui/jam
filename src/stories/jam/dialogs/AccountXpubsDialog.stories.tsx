import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Network } from 'bitcoin-address-validation'
import { AccountXpubsAccordion, AccountXpubsDialog } from '@/components/settings/AccountXpubsDialog'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof AccountXpubsDialog> = {
  title: 'Dialog/AccountXpubsDialog',
  component: AccountXpubsDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <AccountXpubsDialog {...args} open={open} onOpenChange={() => setOpen(false)} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof AccountXpubsDialog>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    hashedPassword: /* hash("test") := */ 'da41454ecc40c48499decbca7b1df4595f0a856caada3f182d47293fbad03004',
    autoCloseTimeout: 60_000,
  },
}

export const Content: StoryObj<typeof AccountXpubsAccordion> = {
  render: () => (
    <AccountXpubsAccordion
      values={[
        {
          accountIndex: 0,
          accountName: 'Apricot',
          path: `m/84'/1'/0'`,
          xpubs: [
            {
              name: 'vpub',
              network: Network.regtest,
              path: `m/84'/1'/0'`,
              xpub: 'vpub5Y6cjg78GGuNLsaPhmYsiw4gYX3HoQiRBiSwDaBXKUafCt9bNwWQiitDk5VZ5BVxYnQdwoTyXSs2JHRPAgjAvtbBrf8ZhDYe2jWAqvZVnsc',
            },
          ],
        },
        {
          accountIndex: 1,
          accountName: 'Blueberry',
          path: `m/84'/1'/1'`,
          xpubs: [
            {
              name: 'vpub',
              network: Network.regtest,
              path: `m/84'/1'/1'`,
              xpub: 'vpub5Y6cjg78GGuNQePrLecqwMCGL7x8YYGFKqN5LCciiMAuXWPjwsX9pvXhqKJdkzDeoE9xvFGM1j6cVLPqHEVDK5idBAye5LzWyqxjXcen358',
            },
          ],
        },
        {
          accountIndex: 2,
          accountName: 'Cherry',
          path: `m/84'/1'/2'`,
          xpubs: [
            {
              name: 'vpub',
              network: Network.regtest,
              path: `m/84'/1'/2'`,
              xpub: 'vpub5Y6cjg78GGuNRjvUZv7izGA5Mwcv3fWG5PD5mFbhTksqeai9Cv8Yi4QND26sa1T6mcQTXMB91biBrBKfSFrfQKeguxmqK1cga6QBi5ZS5o5',
            },
          ],
        },
      ]}
    />
  ),
}
