import { describe, it, expect } from 'vitest'
import { getBoundary, getCharsetName, guid, wrap, mimeDecode, isStringOrError, GB2312UTF8 } from '../../src/utils'

describe('utils', () => {
  describe('getBoundary', () => {
    it('extracts boundary in quotes', () => {
      expect(getBoundary('multipart/mixed; boundary="ABC123"')).toBe('ABC123')
    })
    it('extracts boundary without quotes and trailing params', () => {
      expect(getBoundary('multipart/alternative; boundary=XYZ; charset=utf-8')).toBe('XYZ')
    })
    it('returns undefined when not present', () => {
      expect(getBoundary('text/plain; charset=utf-8')).toBe(undefined)
    })
  })

  describe('getCharsetName', () => {
    it('normalizes charset name', () => {
      expect(getCharsetName('ISO-8859-2')).toBe('iso88592')
    })
  })

  describe('guid', () => {
    it('produces a stable pattern of 16-4-12 hex segments after first hyphen removal in implementation', () => {
      const id = guid()
      expect(id).toMatch(/^[0-9a-f]{16}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      expect(id.replace(/-/g, '').length).toBe(32)
    })
  })

  describe('wrap', () => {
    it('wraps string at width', () => {
      expect(wrap('abcdef', 2)).toBe('ab\r\ncd\r\nef')
    })
  })

  describe('mimeDecode', () => {
    it('decodes =XX hex sequences', () => {
      expect(mimeDecode('=48=69')).toBe('Hi')
    })
    it('passes through normal text', () => {
      expect(mimeDecode('Hello')).toBe('Hello')
    })
    it('handles mixed plain and encoded bytes', () => {
      expect(mimeDecode('A=48B=69C')).toBe('A' + 'H' + 'B' + 'i' + 'C')
    })
  })

  describe('isStringOrError', () => {
    it('identifies string', () => {
      expect(isStringOrError('x')).toBe(true)
    })
    it('identifies Error', () => {
      expect(isStringOrError(new Error('e'))).toBe(true)
    })
    it('rejects number', () => {
      expect(isStringOrError(5 as any)).toBe(false)
    })
  })

  describe('GB2312UTF8 converters (basic smoke)', () => {
    it('round trips simple ascii text (no-op semantics)', () => {
      const original = 'Test'
      const converted = GB2312UTF8.GB2312ToUTF8(original)
      expect(converted).toContain('Test')
    })
    it('UTF8ToGB2312 handles 2-byte and 3-byte sequences without throwing', () => {
      const encoded = '%C3%A9%E6%97%A5'
      const out = GB2312UTF8.UTF8ToGB2312(encoded)
      expect(typeof out).toBe('string')
    })
    it('Dig2Dec returns -1 for invalid length', () => {
      expect((GB2312UTF8 as any).Dig2Dec('101')).toBe(-1)
    })
  })

  describe('GB2312UTF8.Hex2Utf8 edge cases', () => {
    it('should return empty string when hex string is not 16 characters', () => {
      const result = GB2312UTF8.Hex2Utf8('short')
      expect(result).toBe('')
    })

    it('should return empty string for empty input', () => {
      const result = GB2312UTF8.Hex2Utf8('')
      expect(result).toBe('')
    })

    it('should process valid 16-character hex string', () => {
      const validHex = '0030003100320033'
      const result = GB2312UTF8.Hex2Utf8(validHex)
      expect(typeof result).toBe('string')
    })
  })

  describe('GB2312UTF8.GB2312ToUTF8 edge cases', () => {
    it('should handle input with length property in iteration', () => {
      const inputWithPercentAndLength = 'test%u4E2D%more'
      const result = GB2312UTF8.GB2312ToUTF8(inputWithPercentAndLength)
      expect(typeof result).toBe('string')
    })

    it('should handle escape sequences without u prefix', () => {
      const inputWithNormalEscape = 'test%20space'
      const result = GB2312UTF8.GB2312ToUTF8(inputWithNormalEscape)
      expect(result).toContain('test')
    })
  })

  describe('GB2312UTF8.UTF8ToGB2312 complex edge cases', () => {
    it('should handle strings with percentage signs in complex patterns', () => {
      const testString = 'before%after%more'
      const result = GB2312UTF8.UTF8ToGB2312(testString)
      expect(typeof result).toBe('string')
    })

    it('should handle strings with short percentage sequences', () => {
      const testString = '%ab'
      const result = GB2312UTF8.UTF8ToGB2312(testString)
      expect(typeof result).toBe('string')
    })

    it('should handle three-byte UTF-8 sequences', () => {
      const testString = '%E2%82%AC'
      const result = GB2312UTF8.UTF8ToGB2312(testString)
      expect(typeof result).toBe('string')
    })

    it('should handle percentage at position >= 3', () => {
      const testString = 'abc%def'
      const result = GB2312UTF8.UTF8ToGB2312(testString)
      expect(typeof result).toBe('string')
      expect(result).toContain('abc')
    })

    it('should handle single-byte UTF-8 sequences', () => {
      const testString = '%48%65%6C%6C%6F'
      const result = GB2312UTF8.UTF8ToGB2312(testString)
      expect(typeof result).toBe('string')
      expect(result).toContain('Hello')
    })

    it('should handle two-byte UTF-8 sequences correctly', () => {
      const testString = '%C3%A9'
      const result = GB2312UTF8.UTF8ToGB2312(testString)
      expect(typeof result).toBe('string')
    })
  })

  describe('GB2312UTF8.Dig2Dec edge case', () => {
    it('should return -1 for invalid length input', () => {
      const result = GB2312UTF8.Dig2Dec('abc')
      expect(result).toBe(-1)
    })

    it('should handle valid 4-character input', () => {
      const result = GB2312UTF8.Dig2Dec('0123')
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should return input unchanged when no percentage found', () => {
      const testString = 'nopercentage'
      const result = GB2312UTF8.UTF8ToGB2312(testString)
      expect(result).toBe(testString)
    })
  })
})
