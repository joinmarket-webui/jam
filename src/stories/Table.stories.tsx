import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const meta: Meta<typeof Table> = {
  title: 'Core/Table',
  component: Table,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Table>

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Recent wallet activity</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Receive</TableCell>
          <TableCell>
            <Badge variant="secondary">Confirmed</Badge>
          </TableCell>
          <TableCell className="text-right">250,000 sats</TableCell>
        </TableRow>
        <TableRow data-state="selected">
          <TableCell>Send</TableCell>
          <TableCell>
            <Badge variant="outline">Pending</Badge>
          </TableCell>
          <TableCell className="text-right">120,000 sats</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right">370,000 sats</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Jar</TableHead>
          <TableHead>Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="text-muted-foreground text-center">
            No jars found.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}
