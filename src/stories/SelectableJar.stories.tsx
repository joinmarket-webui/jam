import React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SelectableJar } from '../components/ui/SelectableJar'

const meta = {
  title: 'Components/SelectableJar',
  component: SelectableJar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A selectable jar component used for Bitcoin wallet account selection. The jar visually represents a savings account with its fill level indicating the balance relative to the total wallet balance.',
      },
    },
  },
  argTypes: {
    name: {
      description: 'The display name of the jar account',
      control: 'text',
    },
    color: {
      description: 'The color of the jar, affects fill color',
      control: 'color',
    },
    balance: {
      description: 'Current balance of the jar in sats',
      control: { type: 'number', min: 0, step: 1000 },
    },
    totalBalance: {
      description: 'Total wallet balance in sats, used to calculate fill percentage',
      control: { type: 'number', min: 1, step: 1000 },
    },
    isSelected: {
      description: 'Whether the jar is currently selected',
      control: 'boolean',
    },
    onClick: {
      description: 'Callback function triggered when jar is clicked',
      action: 'clicked',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SelectableJar>

export default meta
type Story = StoryObj<typeof meta>

// Add a decorator for all stories
const withPadding = (Story: React.ComponentType) => (
  <div className="p-6">
    <Story />
  </div>
)

export const Selected: Story = {
  decorators: [withPadding],
  args: {
    name: 'Spending',
    color: '#3498db', // Blue
    balance: 150000,
    totalBalance: 500000,
    isSelected: true,
    onClick: () => console.log('Selected jar clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'A jar in selected state. Notice the highlighted indicator dot and slight scale increase.',
      },
    },
  },
}

export const Unselected: Story = {
  decorators: [withPadding],
  args: {
    name: 'Savings',
    color: '#27ae60', // Green
    balance: 250000,
    totalBalance: 500000,
    isSelected: false,
    onClick: () => console.log('Unselected jar clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'A jar in unselected state. The indicator dot is dimmed and the jar is slightly smaller.',
      },
    },
  },
}

export const EmptyJar: Story = {
  decorators: [withPadding],
  args: {
    name: 'Empty',
    color: '#e74c3c', // Red
    balance: 0,
    totalBalance: 500000,
    isSelected: false,
    onClick: () => console.log('Empty jar clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'A jar with zero balance. The jar appears empty regardless of the color assigned.',
      },
    },
  },
}

export const FullJar: Story = {
  decorators: [withPadding],
  args: {
    name: 'Full',
    color: '#f39c12', // Orange
    balance: 500000,
    totalBalance: 500000,
    isSelected: false,
    onClick: () => console.log('Full jar clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'A jar containing the entire wallet balance. The jar is completely filled with the specified color.',
      },
    },
  },
}

// Story that shows all jars in a grid layout
export const JarGrid: Story = {
  args: {
    name: 'Spending',
    color: '#3498db',
    balance: 150000,
    totalBalance: 500000,
    isSelected: true,
    onClick: () => console.log('Jar clicked'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A collection of jars displayed in a grid layout, demonstrating how they would appear in the actual application.',
      },
    },
  },
  render: () => {
    const jars = [
      { name: 'Spending', color: '#3498db', balance: 150000, isSelected: true },
      { name: 'Savings', color: '#27ae60', balance: 250000, isSelected: false },
      { name: 'Emergency', color: '#e74c3c', balance: 50000, isSelected: false },
      { name: 'Travel', color: '#f39c12', balance: 100000, isSelected: false },
      { name: 'Gift', color: '#9b59b6', balance: 0, isSelected: false },
    ]

    const totalBalance = jars.reduce((total, jar) => total + jar.balance, 0)

    return (
      <div className="grid grid-cols-5 gap-4 rounded-lg border p-4">
        {jars.map((jar) => (
          <SelectableJar
            key={jar.name}
            name={jar.name}
            color={jar.color}
            balance={jar.balance}
            totalBalance={totalBalance}
            isSelected={jar.isSelected}
            onClick={() => console.log(`Clicked on ${jar.name}`)}
          />
        ))}
      </div>
    )
  },
}

// Interactive example with controls
export const Interactive: Story = {
  decorators: [withPadding],
  args: {
    name: 'Customize Me',
    color: '#2ecc71',
    balance: 100000,
    totalBalance: 500000,
    isSelected: false,
    onClick: () => console.log('Interactive jar clicked'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'An interactive example where you can modify all properties through the Controls panel to see how they affect the jar appearance.',
      },
    },
  },
}
