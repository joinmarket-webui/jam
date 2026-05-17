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

const meta: Meta<typeof Field> = {
  title: 'Core/Field',
  component: Field,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Field>

export const Default: Story = {
  render: () => (
    <FieldGroup className="max-w-sm">
      <Field>
        <FieldLabel htmlFor="wallet-name">Wallet name</FieldLabel>
        <Input id="wallet-name" placeholder="Enter wallet name" />
        <FieldDescription>This name is only used locally in Jam.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="max-w-sm">
      <Checkbox id="remember-wallet" />
      <FieldContent>
        <FieldLabel htmlFor="remember-wallet">Remember wallet</FieldLabel>
        <FieldDescription>Keep this wallet available in the wallet list.</FieldDescription>
      </FieldContent>
    </Field>
  ),
}

export const WithError: Story = {
  render: () => (
    <FieldGroup className="max-w-sm">
      <Field data-invalid="true">
        <FieldLabel htmlFor="wallet-password">Wallet password</FieldLabel>
        <Input id="wallet-password" type="password" aria-invalid="true" />
        <FieldError>Password is required.</FieldError>
      </Field>
    </FieldGroup>
  ),
}

export const Fieldset: Story = {
  render: () => (
    <FieldSet className="max-w-sm">
      <FieldLegend>Fee settings</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="min-fee">Minimum fee</FieldLabel>
          <Input id="min-fee" defaultValue="21" />
        </Field>
        <FieldSeparator>or</FieldSeparator>
        <Field>
          <FieldTitle>Use default fee</FieldTitle>
          <FieldDescription>Let Jam choose the default fee for this wallet.</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}
