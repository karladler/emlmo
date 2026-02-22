import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { readEml } from '../../src/index'
import type { ReadedEmlJson } from '../../src/interface'

function readTestFixture(filename: string): string {
  return readFileSync(join(__dirname, '..', 'fixtures', filename), 'utf8')
}

describe('inline body content (Content-Disposition: inline)', () => {
  it('uses inline text/plain and text/html attachments as body after fix', () => {
    const eml = readTestFixture('body-as-inline-attachment.eml')
    const parsed = readEml(eml) as ReadedEmlJson

    expect(parsed.text?.trim()).toBe('Test')
    expect(parsed.html?.trim()).toContain('<div>Test</div>')
  })
})
