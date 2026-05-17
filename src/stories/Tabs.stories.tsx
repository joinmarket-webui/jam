import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const meta: Meta<typeof Tabs> = {
  title: 'Core/Tabs',
  component: Tabs,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Tabs>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="receive" className="w-[360px]">
      <TabsList>
        <TabsTrigger value="receive">Receive</TabsTrigger>
        <TabsTrigger value="send">Send</TabsTrigger>
        <TabsTrigger value="earn">Earn</TabsTrigger>
      </TabsList>
      <TabsContent value="receive" className="rounded-lg border p-4">
        Receive funds into a wallet jar.
      </TabsContent>
      <TabsContent value="send" className="rounded-lg border p-4">
        Send funds using a direct or collaborative transaction.
      </TabsContent>
      <TabsContent value="earn" className="rounded-lg border p-4">
        Earn sats by providing liquidity.
      </TabsContent>
    </Tabs>
  ),
}

export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="active" className="w-[360px]">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="rounded-lg border p-4">
        Only active tabs can be selected.
      </TabsContent>
      <TabsContent value="disabled" className="rounded-lg border p-4">
        Disabled content.
      </TabsContent>
    </Tabs>
  ),
}
