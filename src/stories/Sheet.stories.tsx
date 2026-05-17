import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const meta: Meta<typeof Sheet> = {
  title: 'Core/Sheet',
  component: Sheet,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Sheet>

export const Default: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Wallet details</SheetTitle>
          <SheetDescription>Review wallet status without leaving the current page.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confirmed balance</span>
            <span>1,250,000 sats</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Maker status</span>
            <span>Idle</span>
          </div>
        </div>
        <SheetFooter>
          <Button>Open wallet</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const LeftSide: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">Open left sheet</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Small-screen sidebar style sheet.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}
