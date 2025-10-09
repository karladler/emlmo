/// <reference types="mocha" />
import { expect } from 'chai';
import { readEml } from '../../src/index';
import { Base64 } from 'js-base64';

function crlf(lines: string[]) { return lines.join('\r\n') + '\r\n'; }

describe('readEml', () => {
  it('parses simple text/plain message', () => {
    const eml = crlf([
      'Subject: Simple',
      'From: "Tester" <test@example.com>',
      'To: user@example.com',
      'Date: Fri, 21 Feb 2025 10:00:00 +0000',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'Hello world',
    ]);
    const res: any = readEml(eml);
  // Library currently preserves a trailing CRLF in text body
  expect(res.text).to.equal('Hello world\r\n');
    expect(res.subject).to.equal('Simple');
    expect(res.from.email || res.from).to.contain('test@example.com');
  });

  it('parses multipart mixed with text and html', () => {
    const boundary = 'BOUND123';
    const eml = crlf([
      'Subject: Multi',
      'From: <a@example.com>',
      'To: <b@example.com>',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="utf-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      'Line=0ASecond',
      `--${boundary}`,
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: base64',
      '',
      Base64.encode('<b>Hi</b>'),
      `--${boundary}--`,
      '',
    ]);
    const res: any = readEml(eml);
    expect(res.text).to.equal('Line\nSecond');
    expect(res.html).to.contain('<b>Hi</b>');
  });

  it('extracts base64 attachment', () => {
    const boundary = 'ATTBOUND';
    const data = 'Attachment content';
    const eml = crlf([
      'Subject: Attachment',
      'From: <a@example.com>',
      'To: <b@example.com>',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'Body',
      `--${boundary}`,
      'Content-Type: application/octet-stream',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="note.txt"',
      '',
      Base64.encode(data),
      `--${boundary}--`,
      '',
    ]);
    const res: any = readEml(eml);
    expect(res.attachments).to.have.length(1);
    const att = res.attachments[0];
    expect(att.name || att.filename).to.equal('note.txt');
  // Current implementation exposes base64 string in data64 (not decoded content)
  expect(att.data64).to.equal('QXR0YWNobWVudCBjb250ZW50');
  });

  it('reads from pre-parsed object path (text/plain)', () => {
    const obj = { headers: { 'Content-Type': 'text/plain; charset="utf-8"' }, body: 'Body Text' } as any;
    const res: any = readEml(obj);
    expect(res.text).to.equal('Body Text');
  });

  it('returns error when object missing headers', () => {
    const bad: any = { body: 'No headers' };
    const res = readEml(bad as any);
    expect(typeof res === 'string' || res instanceof Error).to.be.true;
  });
});
