import { describe, it } from 'vitest'
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { readEml as readEmlUpstream } from 'eml-parse-js'
import { normalizeReadedEml } from './lib/normalizeReadedEml'

const FIXTURES_DIR = join(__dirname, 'fixtures')
const SNAPSHOTS_DIR = join(__dirname, 'fixtures', 'snapshots', 'upstream')
const EXTENSIONS = new Set(['.eml', '.mhtml'])

function getFixtureFiles(): string[] {
  return readdirSync(FIXTURES_DIR)
    .filter(name => EXTENSIONS.has(name.slice(name.lastIndexOf('.'))))
    .sort()
}

/**
 * Run with: BUILD_UPSTREAM_SNAPSHOTS=1 npm run test -- test/build-upstream-snapshots.test.ts
 * Writes normalized upstream readEml output to test/fixtures/snapshots/upstream/<name>.json
 */
describe('build upstream snapshots', () => {
  it('writes normalized upstream output for each fixture', () => {
    if (!process.env.BUILD_UPSTREAM_SNAPSHOTS) return

    mkdirSync(SNAPSHOTS_DIR, { recursive: true })
    const files = getFixtureFiles()

    for (const name of files) {
      const raw = readFileSync(join(FIXTURES_DIR, name), 'utf8')
      let result: unknown
      try {
        result = readEmlUpstream(raw)
      } catch {
        continue
      }

      if (result instanceof Error || typeof result === 'string') continue
      const normalized = normalizeReadedEml(result as Record<string, unknown>)
      const outPath = join(SNAPSHOTS_DIR, name.replace(/\.(eml|mhtml)$/, '.json'))
      writeFileSync(outPath, JSON.stringify(normalized, null, 2), 'utf8')
    }
  })
})
