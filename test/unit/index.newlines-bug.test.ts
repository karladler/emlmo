import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readEml } from '../../src';

describe('HTML newline preservation bug', () => {
  it('should preserve full paragraph line structure and spacing (expected to FAIL until fixed)', () => {
    const raw = readFileSync(join(__dirname, '..', 'fixtures', 'removed-newlines-repro.eml'), 'utf8');
    const parsed: any = readEml(raw);
    expect(parsed).toBeTypeOf('object');
    expect(typeof parsed.html).toBe('string');

    const expectedParagraph = [
      'This email contains spaces between words',
      'but as you can see, these are sometimes removed,',
      'which causes readability issues',
      'and looks strange'
    ].join('\n');

    const startIdx = parsed.html.indexOf('This email contains spaces between words');
    const endMarker = 'and looks strange';
    const endIdx = parsed.html.indexOf(endMarker) + endMarker.length;
    expect(startIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeGreaterThan(startIdx);
    const rawExtract = parsed.html.substring(startIdx, endIdx);
    const normalizedExtract = rawExtract.replace(/\r\n/g, '\n');
    expect(normalizedExtract).toBe(expectedParagraph);
  });
});
