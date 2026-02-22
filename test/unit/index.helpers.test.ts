import { describe, it, expect } from 'vitest'
import { getEmailAddress, unquoteString, unquotePrintable } from '../../src/index'

describe('index.ts helpers (Batch A)', () => {
  describe('getEmailAddress', () => {
    it('parses single address to object', () => {
      const res = getEmailAddress('User <user@example.com>')
      expect(res && !Array.isArray(res)).toBe(true)
      expect((res as any).email).toBe('user@example.com')
    })
    it('parses multiple addresses to array', () => {
      const res = getEmailAddress('A <a@example.com>, B <b@example.com>')
      expect(Array.isArray(res)).toBe(true)

      if (Array.isArray(res)) {
        expect(res.map(r => r.email)).toEqual(['a@example.com', 'b@example.com'])
      }
    })
    it('returns null on empty string', () => {
      expect(getEmailAddress('')).toBe(null)
    })
    it('decodes encoded-word in display name (Base64 + UTF-8)', () => {
      const res = getEmailAddress('=?UTF-8?B?5pel5pys6Kqe?= <jp@example.com>')
      expect((res as any).name).toBe('日本語')
    })
  })

  describe('unquoteString / decodeJoint', () => {
    it('decodes adjacent encoded words (B then Q) preserving original space', () => {
      const input = '=?UTF-8?B?5pel5pys6Kqe?= =?ISO-8859-1?Q?Andr=E9?='
      const out = unquoteString(input)
      expect(out).toBe('日本語 André')
    })
    it('handles folded encoded words across lines preserving space', () => {
      const input = '=?UTF-8?B?5pel5pys6Kqe?=\r\n =?ISO-8859-1?Q?Andr=E9?='
      const out = unquoteString(input)
      expect(out).toBe('日本語 André')
    })
  })

  describe('unquotePrintable', () => {
    it('joins soft line breaks', () => {
      const input = 'Soft=\r\nBreak'
      expect(unquotePrintable(input)).toBe('SoftBreak')
    })
    it('replaces underscores with space when qEncoding true', () => {
      const input = 'Hello_World'
      expect(unquotePrintable(input, 'utf-8', true)).toBe('Hello World')
    })
    it('preserves internal spaces before soft line break (current behavior)', () => {
      const input = 'Line1   =\r\nLine2\t=\r\n'
      expect(unquotePrintable(input)).toBe('Line1   Line2\t')
    })
    it('keeps hard line break (current behavior)', () => {
      const input = 'Trail   \r\nNext=\r\n'
      expect(unquotePrintable(input)).toBe('Trail\r\nNext')
    })
  })
})
