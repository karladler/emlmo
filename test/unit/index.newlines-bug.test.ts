import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readEml } from '../../src';

// Failing test capturing whitespace/newline swallowing bug in HTML part.
// Current implementation in _append removes all CRLFs from text/html bodies via:
//   htmlContent = content.replace(/\r\n|(&quot;)/g, '').replace(/\"/g, '"');
// This collapses line breaks between words (e.g. 'words\nbut' -> 'wordsbut').

describe('HTML newline preservation bug', () => {
  it('should preserve full paragraph line structure and spacing (expected to FAIL until fixed)', () => {
    const raw = readFileSync(join(__dirname, '..', 'fixtures', 'removed-newlines-repro.eml'), 'utf8');
    const parsed: any = readEml(raw);
    expect(parsed).to.be.an('object');
    expect(parsed.html, 'html body present').to.be.a('string');

    // Canonical expected paragraph (from fixture) with intentional newlines between logical lines.
    const expectedParagraph = [
      'This email contains spaces between words',
      'but as you can see, these are sometimes removed,',
      'which causes readability issues',
      'and looks strange'
    ].join('\n');

    // Extract the paragraph region from parsed HTML: grab from first occurrence of the first line to the last line text.
    const startIdx = parsed.html.indexOf('This email contains spaces between words');
    const endMarker = 'and looks strange';
    const endIdx = parsed.html.indexOf(endMarker) + endMarker.length;
    expect(startIdx, 'start of paragraph found').to.be.greaterThan(-1);
    expect(endIdx, 'end of paragraph found').to.be.greaterThan(startIdx);
    const rawExtract = parsed.html.substring(startIdx, endIdx);

    // Normalize line endings (if any preserved) to \n and collapse Windows line endings.
    const normalizedExtract = rawExtract.replace(/\r\n/g, '\n');

    // Current buggy behavior: all CRLF removed earlier, causing missing newlines and word concatenation.
    // Assert exact structural match (will FAIL until parser preserves newlines).
    expect(normalizedExtract).to.equal(expectedParagraph);

    // Additional invariants we want to protect against regressions:
    const forbiddenConcats = ['wordsbut', 'removed,which', 'issuesand'];
    forbiddenConcats.forEach(token => {
      expect(normalizedExtract, `should not contain concatenated token ${token}`).not.to.contain(token);
    });
  });
});
