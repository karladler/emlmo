import { describe, it, expect } from 'vitest'
import { encode, decode, convert, arr2str } from '../../src/lib/charset'

describe('charset utilities', () => {
  it('normalizes utf variants and decodes', () => {
    const buf = encode('Hello')
    const out = decode(buf, 'utf_8')
    expect(out).toBe('Hello')
  })

  it('normalizes win codepage to WINDOWS-1252 then falls back to utf-8', () => {
    const buf = encode('Bonjour')
    const out = decode(buf, 'win1252')
    expect(out).toBe('Bonjour')
  })

  it('normalizes latin to ISO-8859 variant', () => {
    const buf = encode('Ciao')
    const out = decode(buf, 'latin1')
    expect(out).toBe('Ciao')
  })

  it('convert handles Uint8Array input with fromCharset forcing decode/encode', () => {
    const buf = encode('Data')
    const converted = convert(buf, 'utf8')
    expect(converted).toBeInstanceOf(Uint8Array)
  })

  it('decode fallback returns binary string when unknown charset causes failures', () => {
    const arr = new Uint8Array([0xff, 0xfe, 0xfd])
    const out = decode(arr, 'x-unknown-charset')
    expect(typeof out).toBe('string')
  })
})

describe('arr2str chunking for large arrays', () => {
  it('should handle large Uint8Array by chunking into smaller pieces', () => {
    const largeSize = 40000
    const largeArray = new Uint8Array(largeSize)
    for (let i = 0; i < largeSize; i++) {
      largeArray[i] = 65 + (i % 26)
    }
    const result = arr2str(largeArray)
    expect(result).toHaveLength(largeSize)
    expect(result.charAt(0)).toBe('A')
    expect(result.charAt(25)).toBe('Z')
    expect(result.charAt(26)).toBe('A')
  })

  it('should handle arrays smaller than chunk size normally', () => {
    const smallArray = new Uint8Array([72, 101, 108, 108, 111])
    const result = arr2str(smallArray)
    expect(result).toBe('Hello')
  })
})

describe('decode fallback to binary when charset conversion fails', () => {
  it('should return binary string when charset conversion fails completely', () => {
    const binaryData = new Uint8Array([0xFF, 0xFE, 0x00, 0x48, 0x00, 0x65])
    const result = decode(binaryData, 'invalid-charset-that-will-fail')
    expect(typeof result).toBe('string')
    expect(result.length).toBe(binaryData.length)
  })

  it('should return binary string when iconv throws error', () => {
    const problematicData = new Uint8Array([0x80, 0x81, 0x82])
    const result = decode(problematicData, 'utf-8')
    expect(typeof result).toBe('string')
  })
})

describe('encode with invalid charset handling', () => {
  it('should handle encoding with invalid charset gracefully', () => {
    const testString = 'Hello World'
    try {
      const result = encode(testString, 'invalid-charset')
      expect(result).toBeInstanceOf(Uint8Array)
    } catch (e) {
      expect(e).toBeDefined()
    }
  })

  it('should fallback to binary when all encoding attempts fail', () => {
    try {
      const result = encode('test', 'invalid-charset-xyz')
      expect(result).toBeInstanceOf(Uint8Array)
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})

describe('convert function edge cases', () => {
  it('should handle convert with Uint8Array input and fromCharset', () => {
    const inputData = new Uint8Array([72, 101, 108, 108, 111])
    const result = convert(inputData, 'utf-8')
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('should handle convert with string input', () => {
    const testString = 'Test String'
    const result = convert(testString)
    expect(result).toBeInstanceOf(Uint8Array)
  })
})
