/// <reference types="mocha" />
import { expect } from 'chai';
import { parseEml } from '../../src/index';

function crlf(lines: string[]) { return lines.join('\r\n') + '\r\n'; }

describe('parseRecursive edge/error branches', () => {
  it('handles message with missing Content-Type (warn path)', () => {
    const eml = crlf([
      'Subject: NoCT',
      '',
      'Hello'
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers.Subject).to.equal('NoCT');
    expect(parsed.headers['Content-Type']).to.be.undefined;
    expect(parsed.body).to.equal('Hello\r\n');
  });

  it('detects Content-Type line appearing after initial blank line', () => {
    const eml = crlf([
      'Subject: CTLater',
      '',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'Late body'
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers.Subject).to.equal('CTLater');
    expect(parsed.headers['Content-Type']).to.match(/text\/plain/);
    expect(parsed.body).to.equal('Late body\r\n');
  });

  it('handles multipart without boundary attribute (no array body)', () => {
    const eml = crlf([
      'Subject: MPNoBoundary',
      'Content-Type: multipart/mixed',
      '',
      'Part 1 line'
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers['Content-Type']).to.equal('multipart/mixed');
    expect(parsed.body).to.equal('Part 1 line\r\n');
  });

  it('finalizes last boundary when closing marker missing', () => {
    const eml = crlf([
      'Subject: Incomplete',
      'Content-Type: multipart/mixed; boundary="BINC"',
      '',
      '--BINC',
      'Content-Type: text/plain',
      '',
      'Hello part'
      // No terminating --BINC--
    ]);
    const parsed: any = parseEml(eml);
    expect(Array.isArray(parsed.body)).to.be.true;
    const first = parsed.body[0];
    expect(first.boundary).to.equal('BINC');
  // Implementation preserves trailing CRLF when boundary not explicitly closed
  expect(first.part.body).to.equal('Hello part\r\n');
  });

  it('collects duplicate headers into array', () => {
    const eml = crlf([
      'Subject: Duplicate',
      'X-Test: one',
      'X-Test: two',
      'Content-Type: text/plain',
      '',
      'Body'
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers.Subject).to.equal('Duplicate');
    expect(parsed.headers['X-Test']).to.be.an('array').with.length(2);
    expect(parsed.headers['X-Test'][0]).to.equal('one');
    expect(parsed.headers['X-Test'][1]).to.equal('two');
  });
});
