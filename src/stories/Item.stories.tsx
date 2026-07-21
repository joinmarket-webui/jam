// Replace nextjs-vite with the name of your framework
import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BadgeCheckIcon, ChevronDownIcon, ChevronRightIcon, Plus, PlusIcon, ShieldAlertIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item'

/**
 * A versatile component that you can use to display any content.
 */
const meta: Meta<typeof Item> = {
  title: 'Core/Item',
  component: Item,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'muted'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm'],
    },
  },
  parameters: {
    layout: 'centered',
  },
  args: {
    variant: 'default',
    size: 'default',
  },
} satisfies Meta<typeof Item>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Basic item with title, description, and actions.
 */
export const Default: Story = {
  render: (args) => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Item {...args} variant="outline">
        <ItemContent>
          <ItemTitle>Basic Item</ItemTitle>
          <ItemDescription>A simple item with title and description.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            Action
          </Button>
        </ItemActions>
      </Item>
      <Item variant="outline" size="sm" asChild>
        <a href="#">
          <ItemMedia>
            <BadgeCheckIcon className="size-5" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Your profile has been verified.</ItemTitle>
          </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-4" />
          </ItemActions>
        </a>
      </Item>
    </div>
  ),
}

/**
 * Use the `outline` variant to add a visible border to the item.
 */
export const Outline: Story = {
  render: (args) => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Item {...args} variant="outline">
        <ItemMedia>
          <Avatar className="size-10">
            <AvatarImage className="bg-white" src="/apple-touch-icon.png" />
            <AvatarFallback>JM</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Software Update Available</ItemTitle>
          <ItemDescription>Version 2.0 is now available for download.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="outline">
            Update
          </Button>
        </ItemActions>
      </Item>
    </div>
  ),
}

/**
 * Use the `muted` variant to add a subtle background to the item.
 */
export const Muted: Story = {
  render: (args) => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Item {...args} variant="muted">
        <ItemMedia variant="icon">
          <BadgeCheckIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Account Verified</ItemTitle>
          <ItemDescription>Your account has been successfully verified.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="ghost">
            Dismiss
          </Button>
        </ItemActions>
      </Item>
    </div>
  ),
}

/**
 * Use the `sm` size for a more compact item layout.
 */
export const Small: Story = {
  render: (args) => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <ItemGroup>
        <Item {...args} variant="outline" size="sm">
          <ItemMedia>
            <Avatar className="size-8">
              <AvatarImage className="bg-white" src="/apple-touch-icon.png" />
              <AvatarFallback>JM</AvatarFallback>
            </Avatar>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>New message from Jam</ItemTitle>
            <ItemDescription>Hey, how are you doing?</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item variant="outline" size="sm">
          <ItemMedia>
            <Avatar className="size-8">
              <AvatarImage className="bg-white" src="/apple-touch-icon.png" />
              <AvatarFallback>ML</AvatarFallback>
            </Avatar>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>New message from johndoe</ItemTitle>
            <ItemDescription>Check out this new feature!</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </div>
  ),
}

/**
 * Item with icon media element.
 */
export const WithIcon: Story = {
  render: (args) => (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Item {...args} variant="outline">
        <ItemMedia variant="icon">
          <ShieldAlertIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Security Alert</ItemTitle>
          <ItemDescription>New login detected from unknown device.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="outline">
            Review
          </Button>
        </ItemActions>
      </Item>
    </div>
  ),
}

/**
 * Items with avatar media elements.
 */
export const WithAvatar: Story = {
  render: (args) => (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Item {...args} variant="outline">
        <ItemMedia>
          <Avatar className="size-10">
            <AvatarImage className="bg-white" src="/apple-touch-icon.png" />
            <AvatarFallback>HR</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>HR</ItemTitle>
          <ItemDescription>Last seen 5 months ago</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="icon-sm" variant="outline" className="rounded-full" aria-label="Invite">
            <Plus />
          </Button>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia>
          <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
            <Avatar className="hidden sm:flex">
              <AvatarImage className="bg-white" src="/apple-touch-icon.png" alt="@Jam" />
              <AvatarFallback>JM</AvatarFallback>
            </Avatar>
            <Avatar className="hidden sm:flex">
              <AvatarImage className="bg-white" src="/apple-touch-icon.png" alt="@johndoe" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage className="bg-white" src="/apple-touch-icon.png" alt="@hr" />
              <AvatarFallback>HR</AvatarFallback>
            </Avatar>
          </div>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>No Team Members</ItemTitle>
          <ItemDescription>Invite your team to collaborate on this project.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="outline">
            Invite
          </Button>
        </ItemActions>
      </Item>
    </div>
  ),
}

/**
 * Grouped items with separators.
 */
export const WithGroup: Story = {
  render: (args) => {
    const people = [
      {
        username: 'Jam',
        avatar: '/apple-touch-icon.png',
        email: 'Jam@example.org',
      },
      {
        username: 'johndoe',
        avatar: '/apple-touch-icon.png',
        email: 'johndoe@example.org',
      },
      {
        username: 'hr',
        avatar: '/apple-touch-icon.png',
        email: 'hr@example.org',
      },
    ]

    return (
      <div className="flex w-full max-w-md flex-col gap-6">
        <ItemGroup>
          {people.map((person, index) => (
            <React.Fragment key={person.username}>
              <Item {...args}>
                <ItemMedia>
                  <Avatar>
                    <AvatarImage className="bg-white grayscale" src={person.avatar} />
                    <AvatarFallback>{person.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className="gap-1">
                  <ItemTitle>{person.username}</ItemTitle>
                  <ItemDescription>{person.email}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <PlusIcon />
                  </Button>
                </ItemActions>
              </Item>
              {index !== people.length - 1 && <ItemSeparator />}
            </React.Fragment>
          ))}
        </ItemGroup>
      </div>
    )
  },
}

/**
 * Items in a dropdown menu.
 */
export const WithDropdown: Story = {
  render: (args) => {
    const people = [
      {
        username: 'Jam',
        avatar: '/apple-touch-icon.png',
        email: 'Jam@example.org',
      },
      {
        username: 'johndoe',
        avatar: '/apple-touch-icon.png',
        email: 'johndoe@example.org',
      },
      {
        username: 'hr',
        avatar: '/apple-touch-icon.png',
        email: 'hr@example.org',
      },
    ]

    return (
      <div className="flex min-h-64 w-full max-w-md flex-col items-center gap-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-fit">
              Select <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 [--radius:0.65rem]" align="end">
            {people.map((person) => (
              <DropdownMenuItem key={person.username} className="p-0">
                <Item {...args} size="sm" className="w-full p-2">
                  <ItemMedia>
                    <Avatar className="size-8">
                      <AvatarImage className="bg-white grayscale" src={person.avatar} />
                      <AvatarFallback>{person.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent className="gap-0.5">
                    <ItemTitle>{person.username}</ItemTitle>
                    <ItemDescription>{person.email}</ItemDescription>
                  </ItemContent>
                </Item>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  },
}
