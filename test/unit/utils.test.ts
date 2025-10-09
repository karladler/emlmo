/// <reference types="mocha" />
import { expect } from 'chai';
// Import from source directly to avoid needing built package name resolution during development
import { getBoundary, getCharsetName, guid, wrap, mimeDecode, isStringOrError, GB2312UTF8 } from '../../src/utils';

describe('utils', () => {
	describe('getBoundary', () => {
		it('extracts boundary in quotes', () => {
			expect(getBoundary('multipart/mixed; boundary="ABC123"')).to.equal('ABC123');
		});
		it('extracts boundary without quotes and trailing params', () => {
			expect(getBoundary('multipart/alternative; boundary=XYZ; charset=utf-8')).to.equal('XYZ');
		});
		it('returns undefined when not present', () => {
			expect(getBoundary('text/plain; charset=utf-8')).to.equal(undefined);
		});
	});

	describe('getCharsetName', () => {
		it('normalizes charset name', () => {
			expect(getCharsetName('ISO-8859-2')).to.equal('iso88592');
		});
	});

	describe('guid', () => {
			it('produces a stable pattern of 16-4-12 hex segments after first hyphen removal in implementation', () => {
				const id = guid();
				expect(id).to.match(/^[0-9a-f]{16}-[0-9a-f]{4}-[0-9a-f]{12}$/);
				expect(id.replace(/-/g, '').length).to.equal(32);
			});
	});

	describe('wrap', () => {
		it('wraps string at width', () => {
			expect(wrap('abcdef', 2)).to.equal('ab\r\ncd\r\nef');
		});
	});

	describe('mimeDecode', () => {
		it('decodes =XX hex sequences', () => {
			// =48=69 => Hi
			expect(mimeDecode('=48=69')).to.equal('Hi');
		});
		it('passes through normal text', () => {
			expect(mimeDecode('Hello')).to.equal('Hello');
		});
			it('handles mixed plain and encoded bytes', () => {
				expect(mimeDecode('A=48B=69C')).to.equal('A' + 'H' + 'B' + 'i' + 'C');
			});
	});

	describe('isStringOrError', () => {
		it('identifies string', () => {
			expect(isStringOrError('x')).to.be.true;
		});
		it('identifies Error', () => {
			expect(isStringOrError(new Error('e'))).to.be.true;
		});
		it('rejects number', () => {
			expect(isStringOrError(5 as any)).to.be.false;
		});
	});

	describe('GB2312UTF8 converters (basic smoke)', () => {
		it('round trips simple ascii text (no-op semantics)', () => {
			const original = 'Test';
			const converted = GB2312UTF8.GB2312ToUTF8(original);
			// ascii should remain readable
			expect(converted).to.contain('Test');
		});
			it('UTF8ToGB2312 handles 2-byte and 3-byte sequences without throwing', () => {
				// %C3%A9 (é) and %E6%97%A5 (日) embedded
				const encoded = '%C3%A9%E6%97%A5';
				const out = GB2312UTF8.UTF8ToGB2312(encoded);
				expect(out).to.be.a('string');
			});
				it('Dig2Dec returns -1 for invalid length', () => {
				expect((GB2312UTF8 as any).Dig2Dec('101')).to.equal(-1);
			});
	});
});

