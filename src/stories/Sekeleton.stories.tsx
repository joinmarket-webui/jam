import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'Core/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Skeleton>

export const Default: Story = {
  args: {
    style: {
      width: '100%',
      height: '42px',
    },
  },
}

export const Rounded: Story = {
  render: () => <Skeleton className="h-12 w-12 rounded-full" />,
}

export const FormSkeleton: Story = {
  render: () => (
    <div className="flex flex-col space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[75px]" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[75px]" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  ),
}

export const CardSkeleton: Story = {
  render: () => (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <CardTitle>
            <Skeleton className="h-4 w-[75px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full" />
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter className="space-x-2">
        <Skeleton className="h-8 w-[75px]" />
        <Skeleton className="h-8 w-[75px]" />
      </CardFooter>
    </Card>
  ),
}
