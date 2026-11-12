import { describe, expect, it } from 'vitest'
import { historyEntryAmount, txHistoryToCsv } from './txHistoryUtils'

describe('txHistoryUtils', () => {
  describe('historyEntryAmount', () => {
    it('returns the coinjoin amount of maker and taker entries', () => {
      expect(historyEntryAmount({ timestamp: '', role: 'maker', amount: 100000, cj_amount: 100000 })).toBe(100000)
      expect(historyEntryAmount({ timestamp: '', role: 'taker', cj_amount: 100000 })).toBe(100000)
    })

    it('returns the amount of direct sends and deposits', () => {
      expect(historyEntryAmount({ timestamp: '', role: 'send', amount: 50000, cj_amount: null })).toBe(50000)
      expect(historyEntryAmount({ timestamp: '', role: 'deposit', amount: 25000, cj_amount: null })).toBe(25000)
    })

    it('returns undefined if the entry has no amount', () => {
      expect(historyEntryAmount({ timestamp: '', role: 'send' })).toBeUndefined()
    })
  })

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

    it('exports timestamps without an offset as UTC', () => {
      const csv = txHistoryToCsv([
        { timestamp: '2026-10-31T13:10:05', txid: 'tx_1', role: 'deposit', amount: 1000 },
        { timestamp: '2026-10-14T10:38:39.123456', txid: 'tx_2', role: 'maker', cj_amount: 2000 },
        { timestamp: '2026-10-31T18:40:05+05:30', txid: 'tx_3', role: 'send', amount: 3000 },
      ])

      const lines = csv.split('\n')
      expect(lines[1]).toMatch(/^2026-10-31T13:10:05\.000Z,tx_1,/)
      expect(lines[2]).toMatch(/^2026-10-14T10:38:39\.123Z,tx_2,/)
      expect(lines[3]).toMatch(/^2026-10-31T13:10:05\.000Z,tx_3,/)
    })

    it('keeps unparsable timestamps as they are', () => {
      const csv = txHistoryToCsv([{ timestamp: 'unknown', txid: 'tx_1', role: 'deposit', amount: 1000 }])

      expect(csv.split('\n', 2)[1]).toMatch(/^unknown,tx_1,/)
    })

    it('escapes special characters such as commas and quotes in CSV fields', () => {
      const csv = txHistoryToCsv([
        {
          timestamp: '2026-11-01T10:00:00.000Z',
          txid: 'tx,"quoted",val',
          role: 'send',
          amount: 1000,
          net_fee: 0,
          confirmations: 1,
        },
      ])

      const lines = csv.trim().split('\n')
      expect(lines[1]).toBe('2026-11-01T10:00:00.000Z,"tx,""quoted"",val",send,1000,0,1')
    })
  })
})
