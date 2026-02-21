import { base64Encode } from './base64';
import { decode } from './charset';
import { getBoundary, guid, wrap } from './utils';
import type { EmailAddress, ReadedEmlJson, BuildOptions, CallbackFn } from './interface';

let verbose = false;

function toEmailAddress(data?: string | EmailAddress | EmailAddress[] | null): string {
  let email = '';
  if (typeof data === 'undefined') return email;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        let str = '';
        if (item.name) str += '"' + item.name.replace(/^"|"\s*$/g, '') + '" ';
        if (item.email) str += '<' + item.email + '>';
        return str;
      })
      .filter((a) => a)
      .join(', ');
  }
  if (data?.name) email += '"' + data.name.replace(/^"|"\s*$/g, '') + '" ';
  if (data?.email) email += '<' + data.email + '>';
  return email;
}

function createBoundary(): string {
  return '----=' + guid();
}

function build(
  data: ReadedEmlJson,
  options?: BuildOptions | CallbackFn<string> | null,
  callback?: CallbackFn<string>
): string | Error {
  if (typeof options === 'function' && typeof callback === 'undefined') {
    callback = options;
    options = null;
  }
  let error: Error | string | undefined;
  let eml = '';
  const EOL = '\r\n';

  try {
    if (!data?.headers) throw new Error('Argument "data" expected to be an object with headers');

    if (typeof data.subject === 'string') data.headers['Subject'] = data.subject;
    if (typeof data.from !== 'undefined') data.headers['From'] = toEmailAddress(data.from);
    if (typeof data.to !== 'undefined') data.headers['To'] = toEmailAddress(data.to);
    if (typeof data.cc !== 'undefined') data.headers['Cc'] = toEmailAddress(data.cc);

    const emlBoundary = getBoundary(data.headers['Content-Type'] || data.headers['Content-type'] || '');
    let hasBoundary = false;
    let boundary = createBoundary();
    let multipartBoundary = '';
    if (data.multipartAlternative) {
      multipartBoundary = '' + (getBoundary(data.multipartAlternative['Content-Type']) || '');
      hasBoundary = true;
    }
    if (emlBoundary) {
      boundary = emlBoundary;
      hasBoundary = true;
    } else {
      data.headers['Content-Type'] = data.headers['Content-type'] || 'multipart/mixed;' + EOL + 'boundary="' + boundary + '"';
    }

    const keys = Object.keys(data.headers);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value: string | string[] = data.headers[key];
      if (typeof value === 'undefined') continue;
      if (typeof value === 'string') {
        eml += key + ': ' + value.replace(/\r?\n/g, EOL + '  ') + EOL;
      } else {
        for (let j = 0; j < value.length; j++) {
          eml += key + ': ' + value[j].replace(/\r?\n/g, EOL + '  ') + EOL;
        }
      }
    }

    if (data.multipartAlternative) {
      eml += EOL;
      eml += '--' + emlBoundary + EOL;
      eml += 'Content-Type: ' + data.multipartAlternative['Content-Type'].replace(/\r?\n/g, EOL + '  ') + EOL;
    }

    eml += EOL;

    if (data.text) {
      if (typeof options === 'object' && !!options && options.encode && data.textheaders) {
        eml += '--' + boundary + EOL;
        for (const key in data.textheaders) {
          if (Object.prototype.hasOwnProperty.call(data.textheaders, key)) {
            eml += `${key}: ${data.textheaders[key].replace(/\r?\n/g, EOL + '  ')}`;
          }
        }
      } else if (hasBoundary) {
        eml += '--' + (multipartBoundary ? multipartBoundary : boundary) + EOL;
        eml += 'Content-Type: text/plain; charset="utf-8"' + EOL;
      }
      eml += EOL + data.text;
      eml += EOL;
    }

    if (data.html) {
      if (typeof options === 'object' && !!options && options.encode && data.textheaders) {
        eml += '--' + boundary + EOL;
        for (const key in data.textheaders) {
          if (Object.prototype.hasOwnProperty.call(data.textheaders, key)) {
            eml += `${key}: ${data.textheaders[key].replace(/\r?\n/g, EOL + '  ')}`;
          }
        }
      } else if (hasBoundary) {
        eml += '--' + (multipartBoundary ? multipartBoundary : boundary) + EOL;
        eml += 'Content-Type: text/html; charset="utf-8"' + EOL;
      }
      if (verbose) {
        console.info(`hasBoundary: ${hasBoundary}, emlBoundary: ${emlBoundary}, multipartBoundary: ${multipartBoundary}, boundary: ${boundary}`);
      }
      eml += EOL + data.html;
      eml += EOL;
    }

    if (data.attachments) {
      for (let i = 0; i < data.attachments.length; i++) {
        const attachment = data.attachments[i];
        eml += '--' + boundary + EOL;
        eml += 'Content-Type: ' + (attachment.contentType.replace(/\r?\n/g, EOL + '  ') || 'application/octet-stream') + EOL;
        eml += 'Content-Transfer-Encoding: base64' + EOL;
        eml +=
          'Content-Disposition: ' +
          (attachment.inline ? 'inline' : 'attachment') +
          '; filename="' +
          (attachment.filename || attachment.name || 'attachment_' + (i + 1)) +
          '"' +
          EOL;
        if (attachment.cid) eml += 'Content-ID: <' + attachment.cid + '>' + EOL;
        eml += EOL;
        if (typeof attachment.data === 'string') {
          eml += wrap(base64Encode(attachment.data), 72) + EOL;
        } else {
          eml += wrap(decode(attachment.data), 72) + EOL;
        }
        eml += EOL;
      }
    }

    if (hasBoundary) eml += '--' + boundary + '--' + EOL;
  } catch (e) {
    error = e as string;
  }
  callback && callback(error, eml);
  return error || eml;
}

export { build, toEmailAddress, createBoundary, getBoundary };
export { build as buildEml };
