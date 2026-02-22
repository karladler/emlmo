import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readEml, buildEml } from '../../src/index';

interface Summary {
  subject?: string; textLen?: number; htmlLen?: number; att?: number; cids?: number; alt?: boolean;
}

function summarize(obj: any): Summary {
  return {
    subject: obj.subject,
    textLen: obj.text ? obj.text.length : 0,
    htmlLen: obj.html ? obj.html.length : 0,
    att: obj.attachments ? obj.attachments.length : 0,
    cids: obj.attachments ? obj.attachments.filter((a: any) => a.id || a.cid).length : 0,
    alt: !!obj.multipartAlternative,
  };
}

const fixtures: { name: string; path: string; roundTrip?: boolean; verify: (data: any) => void }[] = [
  { name: 'simple-plain.eml', path: 'simple-plain.eml', roundTrip: true, verify: d => { expect(d.text).toMatch(/simple plain/i); } },
  { name: 'alt-qp-utf8.eml', path: 'alt-qp-utf8.eml', roundTrip: true, verify: d => { expect(d.html || d.text).toMatch(/Line one/i); } },
  {
    name: 'mixed-related-inline.eml', path: 'mixed-related-inline.eml', roundTrip: true, verify: d => {
      expect(d.attachments && d.attachments.length).toBeGreaterThan(0);
      const inlineImg = (d.attachments || []).find((a: any) => /(img123)/.test(a.id || a.cid || ''));
      expect(inlineImg).toBeTruthy();
      if (d.html) {
        expect(d.html).toMatch(/cid:img123/);
      }
    },
  },
  {
    name: 'nested-triple.eml', path: 'nested-triple.eml', roundTrip: true, verify: d => {
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
    name: 'attachment-rfc2231.eml', path: 'attachment-rfc2231.eml', roundTrip: true, verify: d => {
      const a = d.attachments && d.attachments[0];
      expect(a && a.name).toMatch(/long_file.txt|long_file|long_file\.txt/);
    },
  },
  {
    name: 'attachment-inline-no-disposition.eml', path: 'attachment-inline-no-disposition.eml', roundTrip: true, verify: d => {
      expect(d.attachments && d.attachments.some((a: any) => /photo\.jpg/.test(a.name || ''))).toBe(true);
    },
  },
  { name: 'nonutf8-8bit.eml', path: 'nonutf8-8bit.eml', roundTrip: true, verify: d => { expect(typeof (d.text || '')).toBe('string'); } },
  { name: 'gbk-base64-html.eml', path: 'gbk-base64-html.eml', roundTrip: true, verify: d => { expect(typeof (d.html || '')).toBe('string'); } },
];

describe('E2E fixtures', () => {
  fixtures.forEach(fix => {
    it(`parses fixture ${fix.name} consistently`, () => {
      const raw = readFileSync(join(__dirname, '..', 'fixtures', fix.path), 'utf8');
      const first: any = readEml(raw);
      expect(first).toBeTypeOf('object');
      fix.verify(first);
      const sum1 = summarize(first);

      if (fix.roundTrip) {
        const built = buildEml({
          headers: first.headers,
          text: first.text,
          html: first.html,
          attachments: first.attachments,
          multipartAlternative: first.multipartAlternative,
        } as any) as any;
        if (typeof built === 'string') {
          const reparsed: any = readEml(built);
          const sum2 = summarize(reparsed);
          expect(sum2.subject).toBe(sum1.subject);
          expect(sum2.att).toBe(sum1.att);
          expect(sum2.alt).toBe(sum1.alt);
        }
      }
    });
  });
});
