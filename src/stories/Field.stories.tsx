import React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const meta: Meta<typeof Field> = {
  title: 'Core/Field',
  component: Field,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal', 'responsive'],
    },
  },
  parameters: {
    layout: 'centered',
  },
  args: {
    orientation: 'vertical',
  },
  decorators: (Story) => (
    <div className="w-full max-w-md min-w-sm">
      <Story />
    </div>
  ),
} satisfies Meta<typeof Field>

export default meta

type Story = StoryObj<typeof Field>

/**
 * Field with Input component for text input.
 */
export const WithInput: Story = {
  render: (args) => (
    <FieldSet>
      <FieldGroup>
        <Field {...args}>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input id="username" type="text" placeholder="Satoshi" />
          <FieldDescription>Choose a unique username for your account.</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}

export const WithError: Story = {
  render: () => (
    <FieldSet>
      <FieldGroup>
        <Field data-invalid="true">
          <FieldLabel htmlFor="wallet-password">Wallet password</FieldLabel>
          <Input id="wallet-password" type="password" aria-invalid="true" />
          <FieldError>Password is required.</FieldError>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}

export const WithErrors: Story = {
  render: () => (
    <FieldSet>
      <FieldGroup>
        <Field data-invalid="true">
          <FieldLabel htmlFor="wallet-password">Wallet password</FieldLabel>
          <Input id="wallet-password" type="password" aria-invalid="true" />
          <FieldError />
          <FieldError />
          <FieldError />
          <FieldError errors={[{ message: 'Password must be present' }]} />
          <FieldError
            errors={[
              {
                message: 'Password must longer than 32 chars',
              },
              {
                message: 'Password must shorter than 128 chars',
              },
            ]}
          />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}

/**
 * Field with textarea for longer text input.
 */
export const WithTextarea: Story = {
  render: (args) => (
    <FieldSet>
      <FieldGroup>
        <Field {...args}>
          <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
          <Textarea id="feedback" placeholder="Your feedback helps us improve..." rows={4} />
          <FieldDescription>Share your thoughts about our service.</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}

/**
 * Field with Select component for dropdown selections.
 */
export const WithSelect: Story = {
  render: (args) => (
    <Field {...args}>
      <FieldLabel>Department</FieldLabel>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="engineering">Engineering</SelectItem>
          <SelectItem value="design">Design</SelectItem>
          <SelectItem value="marketing">Marketing</SelectItem>
          <SelectItem value="sales">Sales</SelectItem>
          <SelectItem value="support">Customer Support</SelectItem>
          <SelectItem value="hr">Human Resources</SelectItem>
          <SelectItem value="finance">Finance</SelectItem>
          <SelectItem value="operations">Operations</SelectItem>
        </SelectContent>
      </Select>
      <FieldDescription>Select your department or area of work.</FieldDescription>
    </Field>
  ),
}

/**
 * Field with Slider component and dynamic value display.
 */
export const WithSlider: Story = {
  render: () => {
    const [value, setValue] = React.useState([200, 800])
    return (
      <Field>
        <FieldTitle>Price Range</FieldTitle>
        <FieldDescription>
          Set your budget range ($
          <span className="font-medium tabular-nums">{value[0]}</span> -{' '}
          <span className="font-medium tabular-nums">{value[1]}</span>).
        </FieldDescription>
        <Slider
          value={value}
          onValueChange={setValue}
          max={1_000}
          min={0}
          step={10}
          className="mt-2 w-full"
          aria-label="Price Range"
        />
      </Field>
    )
  },
}

/**
 * FieldSet with multiple related fields in a grid layout.
 */
export const WithFieldset: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <FieldSet>
        <FieldLegend>Address Information</FieldLegend>
        <FieldDescription>We need your address to deliver your order.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="street">Home Address</FieldLabel>
            <Input id="street" type="text" placeholder="123 Home St" />
          </Field>
          <FieldSeparator>or</FieldSeparator>
          <Field>
            <FieldLabel htmlFor="company">Company Address</FieldLabel>
            <Input id="company" type="text" placeholder="456 Main St" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input id="city" type="text" placeholder="New York" />
            </Field>
            <Field>
              <FieldLabel htmlFor="zip">Postal Code</FieldLabel>
              <Input id="zip" type="text" placeholder="90502" />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
}

/**
 * Field with checkbox inputs using FieldSet structure.
 */
export const WithCheckbox: Story = {
  render: () => (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">Show these items on the desktop</FieldLegend>
        <FieldDescription>Select the items you want to show on the desktop.</FieldDescription>
        <FieldGroup className="gap-3">
          <Field orientation="horizontal">
            <Checkbox id="finder-pref-9k2-hard-disks-ljj" />
            <FieldLabel htmlFor="finder-pref-9k2-hard-disks-ljj" className="font-normal" defaultChecked>
              Hard disks
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="finder-pref-9k2-external-disks-1yg" />
            <FieldLabel htmlFor="finder-pref-9k2-external-disks-1yg" className="font-normal">
              External disks
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="finder-pref-9k2-cds-dvds-fzt" />
            <FieldLabel htmlFor="finder-pref-9k2-cds-dvds-fzt" className="font-normal">
              CDs, DVDs, and iPods
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="finder-pref-9k2-connected-servers-6l2" />
            <FieldLabel htmlFor="finder-pref-9k2-connected-servers-6l2" className="font-normal">
              Connected servers
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <Field orientation="horizontal">
        <Checkbox id="finder-pref-9k2-sync-folders-nep" defaultChecked />
        <FieldContent>
          <FieldLabel htmlFor="finder-pref-9k2-sync-folders-nep">Sync Desktop & Documents folders</FieldLabel>
          <FieldDescription>
            Your Desktop & Documents folders are being synced with iCloud Drive. You can access them from other devices.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  ),
}

/**
 * Field with RadioGroup for single selection.
 */
export const WithRadio: Story = {
  render: () => (
    <FieldSet>
      <FieldLabel>Subscription Plan</FieldLabel>
      <FieldDescription>Yearly and lifetime plans offer significant savings.</FieldDescription>
      <RadioGroup defaultValue="monthly">
        <Field orientation="horizontal">
          <RadioGroupItem value="monthly" id="plan-monthly" />
          <FieldLabel htmlFor="plan-monthly" className="font-normal">
            Monthly ($9.99/month)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="yearly" id="plan-yearly" />
          <FieldLabel htmlFor="plan-yearly" className="font-normal">
            Yearly ($99.99/year)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="lifetime" id="plan-lifetime" />
          <FieldLabel htmlFor="plan-lifetime" className="font-normal">
            Lifetime ($299.99)
          </FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  ),
}

/**
 * Field with Switch in horizontal orientation.
 */
export const WithSwitch: Story = {
  render: () => (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="2fa">Multi-factor authentication</FieldLabel>
        <FieldDescription>
          Enable multi-factor authentication. If you do not have a two-factor device, you can use a one-time code sent
          to your email.
        </FieldDescription>
      </FieldContent>
      <Switch id="2fa" />
    </Field>
  ),
}

/**
 * Selectable field groups with RadioItem for choice cards.
 */
export const ChoiceCard: Story = {
  render: () => (
    <FieldGroup>
      <FieldSet>
        <FieldLabel htmlFor="compute-environment-p8w">Compute Environment</FieldLabel>
        <FieldDescription>Select the compute environment for your cluster.</FieldDescription>
        <RadioGroup defaultValue="kubernetes">
          <FieldLabel htmlFor="kubernetes-r2h">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Kubernetes</FieldTitle>
                <FieldDescription>Run GPU workloads on a K8s configured cluster.</FieldDescription>
              </FieldContent>
              <RadioGroupItem value="kubernetes" id="kubernetes-r2h" />
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor="vm-z4k">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Virtual Machine</FieldTitle>
                <FieldDescription>Access a VM configured cluster to run GPU workloads.</FieldDescription>
              </FieldContent>
              <RadioGroupItem value="vm" id="vm-z4k" />
            </Field>
          </FieldLabel>
        </RadioGroup>
      </FieldSet>
    </FieldGroup>
  ),
}
