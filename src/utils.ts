import { decode } from './charset';

export function getBoundary(contentType: string) {
  const match = contentType.match(/(?:B|b)oundary=(?:'|")?(.+?)(?:'|")?(?:\s*;[\s\S]*)?$/);
  return match?.[1];
}

export function getCharsetName(charset: string) {
  return charset.toLowerCase().replace(/[^0-9a-z]/g, '');
}

export function guid() {
  const u = crypto.randomUUID().replace(/-/g, '');
  return u.slice(0, 16) + '-' + u.slice(16, 20) + '-' + u.slice(20, 32);
}

export function wrap(s: string, i: number) {
  const lines: string[] = [];
  for (let start = 0; start < s.length; start += i) {
    lines.push(s.slice(start, start + i));
  }
  return lines.join('\r\n');
}

export function mimeDecode(str = '', fromCharset = 'UTF-8') {
  const encodedBytesCount = (str.match(/=[\da-fA-F]{2}/g) ?? []).length;
  const buffer = new Uint8Array(str.length - encodedBytesCount * 2);

  for (let i = 0, len = str.length, bufferPos = 0; i < len; i++) {
    const hex = str.slice(i + 1, i + 3);
    const chr = str[i];
    if (chr === '=' && hex.length === 2 && /[\da-fA-F]{2}/.test(hex)) {
      buffer[bufferPos++] = parseInt(hex, 16);
      i += 2;
    } else {
      buffer[bufferPos++] = chr.charCodeAt(0);
    }
  }

  return decode(buffer, fromCharset);
}

export function isStringOrError(param: unknown) {
  return typeof param === 'string' || param instanceof Error;
}

const HEX_DIGITS = '0123456789ABCDEF';

function dig2Dec(s: string): number {
  if (s.length !== 4) return -1;
  let ret = 0;
  for (let i = 0; i < 4; i++) {
    ret += Number(s[i]) * 2 ** (3 - i);
  }
  return ret;
}

function hex2Utf8(s: string): string {
  if (s.length !== 16) return '';
  const tempS = '1110' + s.slice(0, 4) + '10' + s.slice(4, 10) + '10' + s.slice(10, 16);
  let ret = '';
  for (let i = 0; i < 3; i++) {
    const octet = tempS.slice(i * 8, (i + 1) * 8);
    ret += '%' + HEX_DIGITS[dig2Dec(octet.slice(0, 4))] + HEX_DIGITS[dig2Dec(octet.slice(4, 8))];
  }
  return ret;
}

function dec2Dig(n: number): string {
  let s = '';
  for (let i = 0; i < 4; i++) {
    const bit = 2 ** (3 - i);
    s += n >= bit ? '1' : '0';
    if (n >= bit) n -= bit;
  }
  return s;
}

function str2Hex(s: string): string {
  let result = '';
  for (let i = 0; i < s.length; i++) {
    result += s.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return result;
}

export const GB2312UTF8 = {
  Dig2Dec: dig2Dec,
  Hex2Utf8: hex2Utf8,
  Dec2Dig: dec2Dig,
  Str2Hex: str2Hex,
  GB2312ToUTF8(s1: string) {
    const s = escape(s1);
    const sa = s.split('%');
    let retV = sa[0] ?? '';
    for (let i = 1; i < sa.length; i++) {
      const seg = sa[i];
      if (seg?.startsWith('u')) {
        retV += hex2Utf8(str2Hex(seg.slice(1, 5)));
        if (seg.length > 5) retV += seg.slice(5);
      } else {
        retV += unescape('%' + seg);
        if (seg.length > 0) retV += seg.slice(5);
      }
    }
    return retV;
  },
  UTF8ToGB2312(str1: string) {
    let substr = '';
    let str = str1;
    let i = str.indexOf('%');
    if (i === -1) return str1;

    while (i !== -1) {
      if (i < 3) {
        substr += str.slice(0, Math.max(0, i - 1));
        str = str.slice(i + 1);
        const a = str.slice(0, 2);
        str = str.slice(2);
        const aVal = parseInt(a, 16);
        if ((aVal & 0x80) === 0) {
          substr += String.fromCharCode(aVal);
        } else if ((aVal & 0xe0) === 0xc0) {
          str = str.slice(1);
          const b = str.slice(0, 2);
          str = str.slice(2);
          const widechar = ((aVal & 0x1f) << 6) | (parseInt(b, 16) & 0x3f);
          substr += String.fromCharCode(widechar);
        } else {
          str = str.slice(1);
          const b = str.slice(0, 2);
          str = str.slice(2);
          str = str.slice(1);
          const c = str.slice(0, 2);
          str = str.slice(2);
          const widechar =
            ((aVal & 0x0f) << 12) | ((parseInt(b, 16) & 0x3f) << 6) | (parseInt(c, 16) & 0x3f);
          substr += String.fromCharCode(widechar);
        }
      } else {
        substr += str.slice(0, i);
        str = str.slice(i);
      }
      i = str.indexOf('%');
    }
    return substr + str;
  },
};
