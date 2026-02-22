import { base64Decode, base64ToUint8Array } from '../lib/base64';
import { decode, encode } from '../lib/charset';
import { GB2312UTF8, getCharsetName } from '../utils';
import { mimeWordsDecode } from '../lib/mimeWordsDecode';
import type { Attachment, EmlHeaders, ReadedEmlJson } from '../interface';
import { getCharset, unquotePrintable, DEFAULT_CHARSET } from './contentDecode';

export function appendPart(
  headers: EmlHeaders,
  content: string | Uint8Array | Attachment,
  result: ReadedEmlJson,
): void {
  const contentType = headers['Content-Type'] || headers['Content-type'];
  const contentDisposition = headers['Content-Disposition'];
  const ctStr = typeof contentType === 'string' ? contentType : Array.isArray(contentType) ? contentType[0] : '';
  const charset = getCharsetName(getCharset(ctStr) || DEFAULT_CHARSET);
  let encoding = headers['Content-Transfer-Encoding'] || headers['Content-transfer-encoding'];

  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  let rawBase64: string | undefined;

  if (encoding === 'base64') {
    const raw = (content as string).replace(/\r?\n/g, '');
    rawBase64 = raw;
    const ctForGbk =
      typeof contentType === 'string' ? contentType : Array.isArray(contentType) ? contentType[0] : '';

    if (ctForGbk?.indexOf('gbk') >= 0) {
      content = encode(GB2312UTF8.GB2312ToUTF8(raw));
    } else {
      content = base64ToUint8Array(raw);
    }
  } else if (encoding === 'quoted-printable') {
    content = unquotePrintable(content as string, charset);
  } else if (encoding && charset !== 'utf8' && /binary|8bit/.test(encoding)) {
    content = decode(content as Uint8Array, charset);
  }

  if (!contentDisposition && ctStr?.indexOf('text/html') >= 0) {
    if (typeof content !== 'string') content = decode(content as Uint8Array, charset);
    let htmlContent = (content as string).replace(/&quot;/g, '"').replace(/\r\n/g, '\n');
    try {
      if (encoding !== 'base64') {
        const compact = htmlContent.replace(/\s+/g, '');
        const base64Like =
          /^[A-Za-z0-9+/]+={0,2}$/.test(compact) && compact.length % 4 === 0 && compact.length >= 16;

        if (base64Like) {
          try {
            const decodedProbe = base64Decode(compact);

            if (/(<html|<div|<p|<span|<br\b|<h[1-6]|<body)/i.test(decodedProbe)) {
              htmlContent = decodedProbe;
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
    result.html = result.html ? result.html + htmlContent : htmlContent;
    result.htmlheaders = { 'Content-Type': ctStr, 'Content-Transfer-Encoding': encoding || '' };

    return;
  }

  if (!contentDisposition && ctStr?.indexOf('text/plain') >= 0) {
    if (typeof content !== 'string') content = decode(content as Uint8Array, charset);
    result.text = result.text ? result.text + content : content;
    result.textheaders = { 'Content-Type': ctStr, 'Content-Transfer-Encoding': encoding || '' };

    return;
  }

  if (!result.attachments) result.attachments = [];
  const attachment: Attachment = {
    name: '',
    contentType: '',
    inline: false,
    data: content as Uint8Array,
    data64: rawBase64 ?? decode(content as Uint8Array, charset),
  };

  const id = headers['Content-ID'] || headers['Content-Id'];

  if (id !== undefined && id !== null && typeof id === 'string') attachment.id = id;

  const nameKeys = ['Content-Disposition', 'Content-Type', 'Content-type'];
  for (const key of nameKeys) {
    const raw = headers[key as keyof EmlHeaders];
    const name = typeof raw === 'string' ? raw : Array.isArray(raw) && typeof raw[0] === 'string' ? raw[0] : '';

    if (name) {
      const resultName = name
        .replace(/(\s|'|utf-8|\*[0-9]\*)/g, '')
        .split(';')
        .map((v) => /name[*]?="?(.+?)"?$/i.exec(v))
        .reduce((a, b) => (b?.[1] ? a + b[1] : a), '');

      if (resultName) {
        attachment.name = mimeWordsDecode(decodeURI(resultName));
        break;
      }
    }
  }

  const ct = headers['Content-Type'] || headers['Content-type'];

  if (ct) {
    const ctVal = typeof ct === 'string' ? ct : Array.isArray(ct) ? ct[0] : '';
    attachment.contentType = typeof ctVal === 'string' ? ctVal : '';
  }
  const cd = headers['Content-Disposition'];
  attachment.inline = cd ? /^\s*inline/.test(cd) : false;
  result.attachments.push(attachment);
}
