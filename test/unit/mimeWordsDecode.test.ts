import { it, expect } from 'vitest'
import { mimeWordsDecode } from '../../src/lib/mimeWordsDecode'

it('should return an empty string for empty input', () => {
  expect(mimeWordsDecode('')).toBe('')
})

it('should return the original string if not MIME-encoded', () => {
  const plain = 'simple-filename.txt'
  expect(mimeWordsDecode(plain)).toBe(plain)
})

it('should decode a single Base64-encoded word', () => {
  const encoded = '=?UTF-8?Q?See_on_=C3=B5hin_test?='
  const decoded = mimeWordsDecode(encoded)
  expect(decoded).toBe('See on õhin test')
})

it('should decode multipart Base64-encoded words into a single string', () => {
  const encoded
    = '=?utf-8?B?UmVwb3J0X0ZpbmFuY2lhbF9TdW1t?= =?utf-8?B?YXJ5XzIwMjVfSmFuLnBkZg==?='
  const decoded = mimeWordsDecode(encoded)
  expect(decoded).toBe('Report_Financial_Summary_2025_Jan.pdf')
})

it('should handle different encodings in the same header', () => {
  const plain = `=?utf-8?B?anVzdCBhbiBleGFtcGxlX18=?=
=?utf-8?Q?unencoded.xlsx?=`
  expect(mimeWordsDecode(plain)).toBe('just an example__unencoded.xlsx')
})
