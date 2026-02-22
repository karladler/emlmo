import { decode } from '../lib/charset';
import { getCharsetName, mimeDecode } from '../utils';
import { base64ToUint8Array } from '../lib/base64';

const DEFAULT_CHARSET = 'utf-8';

export function getCharset(contentType: string): string | undefined {
  const match = /charset\s*=\W*([\w-]+)/g.exec(contentType);

  return match ? match[1] : undefined;
}

function decodeJoint(str: string): string {
  const match = /=\?([^?]+)\?(B|Q)\?(.+?)(\?=)/gi.exec(str);

  if (!match) return str;
  const charset = getCharsetName(match[1] || DEFAULT_CHARSET);
  const type = match[2].toUpperCase();
  const value = match[3];

  if (type === 'B') {
    return decode(base64ToUint8Array(value.replace(/\r?\n/g, '')), charset);
  }

  if (type === 'Q') {
    return unquotePrintable(value, charset, true);
  }

  return str;
}

export function unquoteString(str: string): string {
  const regex = /=\?([^?]+)\?(B|Q)\?(.+?)(\?=)/gi;
  let decodedString = str || '';
  const spinOffMatch = decodedString.match(regex);

  if (spinOffMatch) {
    spinOffMatch.forEach((spin) => {
      decodedString = decodedString.replace(spin, decodeJoint(spin));
    });
  }

  return decodedString.replace(/\r?\n/g, '');
}

export function unquotePrintable(value: string, charset?: string, qEncoding = false): string {
  let rawString = value
    .replace(/[\t ]+$/gm, '')
    .replace(/=(?:\r?\n|$)/g, '');

  if (qEncoding) {
    rawString = rawString.replace(/_/g, decode(new Uint8Array([0x20]), charset));
  }

  return mimeDecode(rawString, charset);
}

export { DEFAULT_CHARSET };
