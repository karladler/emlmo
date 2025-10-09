/// <reference types="mocha" />
import { expect } from 'chai';
import { encode, decode, convert } from '../../src/charset';

/**
 * charset.ts coverage for normalization and fallback sequence
 */
describe('charset utilities', () => {
  it('normalizes utf variants and decodes', () => {
    const buf = encode('Hello');
    const out = decode(buf, 'utf_8'); // triggers normalize utf-8 path
    expect(out).to.equal('Hello');
  });

  it('normalizes win codepage to WINDOWS-1252 then falls back to utf-8', () => {
    const buf = encode('Bonjour');
    const out = decode(buf, 'win1252');
    expect(out).to.equal('Bonjour');
  });

  it('normalizes latin to ISO-8859 variant', () => {
    const buf = encode('Ciao');
    const out = decode(buf, 'latin1');
    expect(out).to.equal('Ciao');
  });

  it('convert handles Uint8Array input with fromCharset forcing decode/encode', () => {
    const buf = encode('Data');
    const converted = convert(buf, 'utf8');
    expect(converted).to.be.instanceOf(Uint8Array);
  });

  it('decode fallback returns binary string when unknown charset causes failures', () => {
    // Provide invalid utf sequence to force failure in first fatal path then succeed in non-fatal
    const arr = new Uint8Array([0xff, 0xfe, 0xfd]);
    const out = decode(arr, 'x-unknown-charset');
    expect(out).to.be.a('string');
  });
});
