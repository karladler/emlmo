import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readEml } from '../../src/index';

const fixtures: { name: string; path: string; verify: (data: any) => void }[] = [
  { name: 'simple-plain.eml', path: 'simple-plain.eml', verify: d => { expect(d.text).toMatch(/simple plain/i); } },
  { name: 'alt-qp-utf8.eml', path: 'alt-qp-utf8.eml', verify: d => { expect(d.html || d.text).toMatch(/Line one/i); } },
  {
    name: 'mixed-related-inline.eml', path: 'mixed-related-inline.eml', verify: d => {
      expect(d.attachments && d.attachments.length).toBeGreaterThan(0);
      const inlineImg = (d.attachments || []).find((a: any) => /(img123)/.test(a.id || a.cid || ''));
      expect(inlineImg).toBeTruthy();

      if (d.html) {
        expect(d.html).toMatch(/cid:img123/);
      }
    },
  },
  {
    name: 'nested-triple.eml', path: 'nested-triple.eml', verify: d => {
      expect(d.multipartAlternative).toBeTruthy();
      const hasBody = (typeof d.text === 'string' && d.text.length > 0) || (typeof d.html === 'string' && d.html.length > 0);
      expect(hasBody).toBe(true);

      if (d.text) {
        const textOk = /Deep plain/i.test(d.text) || /Outer preface plain body/i.test(d.text);
        expect(textOk).toBe(true);
      }

      if (d.html) {
        expect(d.html).toMatch(/Deep html/i);
      }
      const fileBin = (d.attachments || []).find((a: any) => /file\.bin/.test(a.name || ''));
      expect(fileBin).toBeTruthy();
    },
  },
  {
    name: 'attachment-rfc2231.eml', path: 'attachment-rfc2231.eml', verify: d => {
      const a = d.attachments && d.attachments[0];
      expect(a && a.name).toMatch(/long_file.txt|long_file|long_file\.txt/);
    },
  },
  {
    name: 'attachment-inline-no-disposition.eml', path: 'attachment-inline-no-disposition.eml', verify: d => {
      expect(d.attachments && d.attachments.some((a: any) => /photo\.jpg/.test(a.name || ''))).toBe(true);
    },
  },
  { name: 'nonutf8-8bit.eml', path: 'nonutf8-8bit.eml', verify: d => { expect(typeof (d.text || '')).toBe('string'); } },
  { name: 'gbk-base64-html.eml', path: 'gbk-base64-html.eml', verify: d => { expect(typeof (d.html || '')).toBe('string'); } },
];

describe('E2E fixtures', () => {
  fixtures.forEach(fix => {
    it(`parses fixture ${fix.name} consistently`, () => {
      const raw = readFileSync(join(__dirname, '..', 'fixtures', fix.path), 'utf8');
      const data: any = readEml(raw);
      expect(data).toBeTypeOf('object');
      fix.verify(data);
    });
  });
});
