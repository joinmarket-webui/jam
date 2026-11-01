import { describe, expect, it } from 'vitest'
import { txHistoryToCsv } from './txHistoryUtils'

describe('txHistoryUtils', () => {
  describe('txHistoryToCsv', () => {
    it('returns only the header when entries are empty', () => {
      const csv = txHistoryToCsv([])
      expect(csv).toBe('timestamp,txid,role,amount,net_fee,confirmations')
    })

    it('correctly serializes entries to CSV', () => {
      const csv = txHistoryToCsv([
        {
          timestamp: '2026-11-01T10:00:00.000Z',
          txid: 'tx_123',
          role: 'send',
          amount: 50000,
          net_fee: -250,
          confirmations: 3,
        },
        {
          timestamp: '2026-11-01T11:00:00.000Z',
          txid: 'tx_456',
          role: 'maker',
          cj_amount: 100000,
          net_fee: 500,
          confirmations: 12,
        },
      ])

      const lines = csv.trim().split('\n')
      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe('timestamp,txid,role,amount,net_fee,confirmations')
      expect(lines[1]).toBe('2026-11-01T10:00:00.000Z,tx_123,send,50000,-250,3')
      expect(lines[2]).toBe('2026-11-01T11:00:00.000Z,tx_456,maker,100000,500,12')
    })

    it('escapes special characters such as commas and quotes in CSV fields', () => {
      const csv = txHistoryToCsv([
        {
          timestamp: '2026-11-01',
          txid: 'tx,"quoted",val',
          role: 'send',
          amount: 1000,
          net_fee: 0,
          confirmations: 1,
        },
      ])

      const lines = csv.trim().split('\n')
      expect(lines[1]).toBe('2026-11-01,"tx,""quoted"",val",send,1000,0,1')
    })
  })
})
