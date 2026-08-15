import type { Meta, StoryObj } from '@storybook/react-vite'
import { OfferCard } from '@/components/earn/OfferCard'

const meta: Meta<typeof OfferCard> = {
  title: 'Jam/OfferCard',
  component: OfferCard,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof OfferCard>

export const Absolute: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0absoffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '21',
    },
    nickname: 'TEST7i74jfC9M8MV',
  },
}

export const Relative: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0reloffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '0.000021',
    },
    nickname: 'TESTCKqXnDjxnFHN',
  },
}

export const Checking: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0reloffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '0.000021',
    },
    nickname: 'TESTCKqXnDjxnFHN',
    orderbookStatus: 'checking',
  },
}

export const Visible: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0reloffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '0.000021',
    },
    nickname: 'TESTCKqXnDjxnFHN',
    orderbookStatus: 'visible',
  },
}

export const Missing: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0reloffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '0.000021',
    },
    nickname: 'TESTCKqXnDjxnFHN',
    orderbookStatus: 'missing',
  },
}

export const Error: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0reloffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '0.000021',
    },
    nickname: 'TESTCKqXnDjxnFHN',
    orderbookStatus: 'error',
  },
}

export const RelativeWithFidelityBondNotYetInLocalOrderbook: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0reloffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '0.000021',
    },
    nickname: 'TESTCKqXnDjxnFHN',
    orderbookStatus: 'visible',
    orderbookOffer: {
      counterparty: 'TESTCKqXnDjxnFHN',
      oid: 0,
      ordertype: 'sw0reloffer',
      fidelity_bond_value: 0,
    },
    fidelityBond: {
      counterparty: 'TESTCKqXnDjxnFHN',
      amount: 123_456_789,
      locktime: 1_000_000,
    },
  },
}

export const RelativeWithFidelityBondInLocalOrderbook: Story = {
  args: {
    value: {
      oid: 0,
      ordertype: 'sw0reloffer',
      minsize: 90_463,
      maxsize: 9_008_744_958,
      txfee: 0,
      cjfee: '0.000021',
    },
    nickname: 'TESTCKqXnDjxnFHN',
    orderbookStatus: 'visible',
    orderbookOffer: {
      counterparty: 'TESTCKqXnDjxnFHN',
      oid: 0,
      ordertype: 'sw0reloffer',
      fidelity_bond_value: 123_456_789.1337,
    },
    fidelityBond: {
      counterparty: 'TESTCKqXnDjxnFHN',
      amount: 123_456_789,
      locktime: 0,
    },
  },
}
