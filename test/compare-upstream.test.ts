import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { readEml as readEmlUpstream } from 'eml-parse-js'
import { readEml as readEmlOurs } from '../src/index'
import { normalizeReadedEml } from './lib/normalizeReadedEml'

const FIXTURES_DIR = join(__dirname, 'fixtures')
const EXTENSIONS = new Set(['.eml', '.mhtml'])

function getFixtureFiles(): string[] {
  return readdirSync(FIXTURES_DIR)
    .filter(name => EXTENSIONS.has(name.slice(name.lastIndexOf('.'))))
    .sort()
}

const skipFixtures: string[] = [
  'body-as-inline-attachment.eml', // we extract body from inline parts; upstream leaves text/html undefined
  'calendar-invitation.eml', // upstream leaves attachment data64 empty; we populate it
  'gbk-base64-html.eml', // we decode GBK to HTML; upstream keeps base64 string
  'multiple-attachments-mixed-encoding.eml', // upstream leaves some attachment data64 empty
  'multipleRecipientsEmail.eml', // leading space inside body div differs
  'newsletter-with-inline-images.eml', // upstream throws (atob invalid encoding)
  'nonutf8-8bit.eml', // we decode 8bit; upstream returns empty text
  'removed-newlines-repro.eml', // we preserve spaces where upstream strips (readability fix)
  'savedWebpage.mhtml', // upstream throws (atob invalid encoding)
  'smallEmail.eml', // trailing space before </div> differs
  'spam.eml', // boundary preamble: we add spaces between tokens, upstream does not
]

describe('compare with upstream eml-parse-js', () => {
  const files = getFixtureFiles()

  for (const name of files) {
    it(`fixture ${name} matches upstream readEml output`, () => {
      if (skipFixtures.includes(name)) {
        return
      }
      const raw = readFileSync(join(FIXTURES_DIR, name), 'utf8')

      const upstreamResult = readEmlUpstream(raw)

      if (upstreamResult instanceof Error || typeof upstreamResult === 'string') {
        throw new Error(`Upstream readEml failed for ${name}: ${String(upstreamResult)}`)
      }

      const ourResult = readEmlOurs(raw)

      if (ourResult instanceof Error || typeof ourResult === 'string') {
        throw new Error(`Our readEml failed for ${name}: ${String(ourResult)}`)
      }

      const normalizedUpstream = normalizeReadedEml(upstreamResult as Record<string, unknown>)
      const normalizedOurs = normalizeReadedEml(ourResult as Record<string, unknown>)

      expect(normalizedOurs).toEqual(normalizedUpstream)
    })
  }
})
