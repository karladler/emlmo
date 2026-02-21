import { base64Decode, base64ToUint8Array } from './base64';
import { convert, decode, encode } from './charset';
import { GB2312UTF8, getCharsetName, getBoundary, mimeDecode } from './utils';
import type {
  EmailAddress,
  ParsedEmlJson,
  ReadedEmlJson,
  Attachment,
  EmlHeaders,
  Options,
  CallbackFn,
  OptionOrNull,
  BoundaryRawData,
  BoundaryConvertedData,
  BoundaryHeaders,
} from './interface';
import { addressparser } from './addressparser';
import { mimeWordsDecode } from './mimeWordsDecode';

let verbose = false;
const defaultCharset = 'utf-8';

function getCharset(contentType: string): string | undefined {
  const match = /charset\s*=\W*([\w\-]+)/g.exec(contentType);
  return match ? match[1] : undefined;
}

function getEmailAddress(rawStr: string): EmailAddress | EmailAddress[] | null {
  const raw = unquoteString(rawStr);
  const parseList = addressparser(raw);
  const list = parseList.map((v) => ({ name: v.name, email: v.address }) as EmailAddress);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return list;
}

function decodeJoint(str: string): string {
  const match = /=\?([^?]+)\?(B|Q)\?(.+?)(\?=)/gi.exec(str);
  if (match) {
    const charset = getCharsetName(match[1] || defaultCharset);
    const type = match[2].toUpperCase();
    const value = match[3];
    if (type === 'B') {
      return decode(base64ToUint8Array(value.replace(/\r?\n/g, '')), charset);
    }
    if (type === 'Q') {
      return unquotePrintable(value, charset, true);
    }
  }
  return str;
}

function unquoteString(str: string): string {
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

function unquotePrintable(value: string, charset?: string, qEncoding = false): string {
  let rawString = value
    .replace(/[\t ]+$/gm, '')
    .replace(/=(?:\r?\n|$)/g, '');
  if (qEncoding) {
    rawString = rawString.replace(/_/g, decode(new Uint8Array([0x20]), charset));
  }
  return mimeDecode(rawString, charset);
}

function parse(
  eml: string,
  options?: OptionOrNull | CallbackFn<ParsedEmlJson>,
  callback?: CallbackFn<ParsedEmlJson>
): string | Error | ParsedEmlJson {
  if (typeof options === 'function' && typeof callback === 'undefined') {
    callback = options;
    options = null;
  }
  if (typeof options !== 'object') {
    options = { headersOnly: false };
  }
  let error: string | Error | undefined;
  let result: ParsedEmlJson | undefined = {} as ParsedEmlJson;
  try {
    if (typeof eml !== 'string') {
      throw new Error('Argument "eml" expected to be string!');
    }
    const lines = eml.split(/\r?\n/);
    result = parseRecursive(lines, 0, result, options as Options) as ParsedEmlJson;
  } catch (e) {
    error = e as string;
  }
  callback && callback(error, result);
  return error || result || new Error('read EML failed!');
}

function parseRecursive(lines: string[], start: number, parent: any, options: Options) {
  let boundary: any = null;
  let lastHeaderName = '';
  let findBoundary = '';
  let insideBody = false;
  let insideBoundary = false;
  let isMultiHeader = false;
  let isMultipart = false;
  let checkedForCt = false;
  let ctInBody = false;

  parent.headers = {};

  function complete(boundary: any) {
    boundary.part = {};
    parseRecursive(boundary.lines, 0, boundary.part, options);
    delete boundary.lines;
  }

  for (let i = start; i < lines.length; i++) {
    let line = lines[i];

    if (!insideBody) {
      if (line == '') {
        insideBody = true;
        if (options && options.headersOnly) break;

        let ct = parent.headers['Content-Type'] || parent.headers['Content-type'];
        if (!ct) {
          if (checkedForCt) {
            insideBody = !ctInBody;
          } else {
            checkedForCt = true;
            const lineClone = Array.from(lines);
            const string = lineClone.splice(i).join('\r\n');
            const trimmedStrin = string.trim();
            if (trimmedStrin.indexOf('Content-Type') === 0 || trimmedStrin.indexOf('Content-type') === 0) {
              insideBody = false;
              ctInBody = true;
            } else {
              console.warn('Warning: undefined Content-Type');
            }
          }
        } else if (/^multipart\//g.test(ct)) {
          let b = getBoundary(ct);
          if (b && b.length) {
            findBoundary = b;
            isMultipart = true;
            parent.body = [];
          } else if (verbose) {
            console.warn('Multipart without boundary! ' + ct.replace(/\r?\n/g, ' '));
          }
        }
        continue;
      }

      let match = /^\s+([^\r\n]+)/g.exec(line);
      if (match) {
        if (isMultiHeader) {
          parent.headers[lastHeaderName][parent.headers[lastHeaderName].length - 1] += '\r\n' + match[1];
        } else {
          parent.headers[lastHeaderName] += '\r\n' + match[1];
        }
        continue;
      }

      match = /^([\w\d\-]+):\s*([^\r\n]*)/gi.exec(line);
      if (match) {
        lastHeaderName = match[1];
        if (parent.headers[lastHeaderName]) {
          isMultiHeader = true;
          if (typeof parent.headers[lastHeaderName] == 'string') {
            parent.headers[lastHeaderName] = [parent.headers[lastHeaderName]];
          }
          parent.headers[lastHeaderName].push(match[2]);
        } else {
          isMultiHeader = false;
          parent.headers[lastHeaderName] = match[2];
        }
        continue;
      }
    } else {
      if (isMultipart) {
        if (line.indexOf('--' + findBoundary) == 0 && line.indexOf('--' + findBoundary + '--') !== 0) {
          insideBoundary = true;
          if (boundary && boundary.lines) complete(boundary);
          let match = /^\-\-([^\r\n]+)(\r?\n)?$/g.exec(line) as RegExpExecArray;
          boundary = { boundary: match[1], lines: [] as any[] };
          parent.body.push(boundary);
          if (verbose) console.log('Found boundary: ' + boundary.boundary);
          continue;
        }
        if (insideBoundary) {
          if (boundary?.boundary && lines[i - 1] == '' && line.indexOf('--' + findBoundary + '--') == 0) {
            insideBoundary = false;
            complete(boundary);
            continue;
          }
          if (boundary?.boundary && line.indexOf('--' + findBoundary + '--') == 0) continue;
          boundary?.lines.push(line);
        }
      } else {
        parent.body = lines.splice(i).join('\r\n');
        break;
      }
    }
  }

  if (parent.body && parent.body.length && parent.body[parent.body.length - 1].lines) {
    complete(parent.body[parent.body.length - 1]);
  }
  return parent;
}

function completeBoundary(boundary: BoundaryRawData): BoundaryConvertedData | null {
  if (!boundary || !boundary.boundary) return null;
  const lines = boundary.lines || [];
  const result = {
    boundary: boundary.boundary,
    part: { headers: {} },
  } as BoundaryConvertedData;
  let lastHeaderName = '';
  let insideBody = false;
  let childBoundary: BoundaryRawData | undefined;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!insideBody) {
      if (line === '') {
        insideBody = true;
        continue;
      }
      const match = /^([\w\d\-]+):\s*([^\r\n]*)/gi.exec(line);
      if (match) {
        lastHeaderName = match[1];
        result.part.headers[lastHeaderName] = match[2];
        continue;
      }
      const lineMatch = /^\s+([^\r\n]+)/g.exec(line);
      if (lineMatch) {
        result.part.headers[lastHeaderName] += '\r\n' + lineMatch[1];
        continue;
      }
    } else {
      const match = /^\-\-([^\r\n]+)(\r?\n)?$/g.exec(line);
      const childBoundaryStr = getBoundary(result.part.headers['Content-Type'] || result.part.headers['Content-type']);
      if (match && line.indexOf('--' + childBoundaryStr) === 0 && !childBoundary) {
        childBoundary = { boundary: match ? match[1] : '', lines: [] };
        continue;
      }
      if (!!childBoundary && childBoundary.boundary) {
        if (lines[index - 1] === '' && line.indexOf('--' + childBoundary.boundary) === 0) {
          const child = completeBoundary(childBoundary);
          if (child) {
            if (Array.isArray(result.part.body)) {
              result.part.body.push(child);
            } else {
              result.part.body = [child];
            }
          } else {
            result.part.body = childBoundary.lines.join('\r\n');
          }
          if (!!lines[index + 1]) {
            childBoundary.lines = [];
            continue;
          }
          if (line.indexOf('--' + childBoundary.boundary + '--') === 0 && lines[index + 1] === '') {
            childBoundary = undefined;
            break;
          }
        }
        childBoundary.lines.push(line);
      } else {
        result.part.body = lines.splice(index).join('\r\n');
        break;
      }
    }
  }
  return result;
}

function read(
  eml: string | ParsedEmlJson,
  options?: OptionOrNull | CallbackFn<ReadedEmlJson>,
  callback?: CallbackFn<ReadedEmlJson>
): ReadedEmlJson | Error | string {
  if (typeof options === 'function' && typeof callback === 'undefined') {
    callback = options;
    options = null;
  }
  let error: Error | string | undefined;
  let result: ReadedEmlJson | undefined;

  function _append(headers: EmlHeaders, content: string | Uint8Array | Attachment, result: ReadedEmlJson) {
    const contentType = headers['Content-Type'] || headers['Content-type'];
    const contentDisposition = headers['Content-Disposition'];
    const charset = getCharsetName(getCharset(contentType as string) || defaultCharset);
    let encoding = headers['Content-Transfer-Encoding'] || headers['Content-transfer-encoding'];
    if (typeof encoding === 'string') encoding = encoding.toLowerCase();

    if (encoding === 'base64') {
      if (contentType && contentType.indexOf('gbk') >= 0) {
        content = encode(GB2312UTF8.GB2312ToUTF8((content as string).replace(/\r?\n/g, '')));
      } else {
        content = encode((content as string).replace(/\r?\n/g, ''));
      }
    } else if (encoding === 'quoted-printable') {
      content = unquotePrintable(content as string, charset);
    } else if (encoding && charset !== 'utf8' && encoding.search(/binary|8bit/) === 0) {
      content = decode(content as Uint8Array, charset);
    }

    if (!contentDisposition && contentType && contentType.indexOf('text/html') >= 0) {
      if (typeof content !== 'string') content = decode(content as Uint8Array, charset);
      let htmlContent = (content as string)
        .replace(/&quot;/g, '"')
        .replace(/\r\n/g, '\n');
      try {
        if (encoding === 'base64') {
          const compact = htmlContent.replace(/\s+/g, '');
          if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length % 4 === 0) {
            htmlContent = base64Decode(compact);
          }
        } else {
          const compact = htmlContent.replace(/\s+/g, '');
          const base64Like = /^[A-Za-z0-9+/]+={0,2}$/.test(compact) && compact.length % 4 === 0 && compact.length >= 16;
          if (base64Like) {
            try {
              const decodedProbe = base64Decode(compact);
              if (/(<html|<div|<p|<span|<br\b|<h[1-6]|<body)/i.test(decodedProbe)) {
                htmlContent = decodedProbe;
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.error(err);
      }
      if (result.html) result.html += htmlContent;
      else result.html = htmlContent;
      result.htmlheaders = { 'Content-Type': contentType, 'Content-Transfer-Encoding': encoding || '' };
    } else if (!contentDisposition && contentType && contentType.indexOf('text/plain') >= 0) {
      if (typeof content !== 'string') content = decode(content as Uint8Array, charset);
      if (encoding === 'base64') content = base64Decode(content);
      if (result.text) result.text += content;
      else result.text = content;
      result.textheaders = { 'Content-Type': contentType, 'Content-Transfer-Encoding': encoding || '' };
    } else {
      if (!result.attachments) result.attachments = [];
      const attachment = {} as Attachment;
      const id = headers['Content-ID'] || headers['Content-Id'];
      if (id) attachment.id = id;
      const NameContainer = ['Content-Disposition', 'Content-Type', 'Content-type'];
      let result_name: string | undefined;
      for (const key of NameContainer) {
        const name: string = headers[key];
        if (name) {
          result_name = name
            .replace(/(\s|'|utf-8|\*[0-9]\*)/g, '')
            .split(';')
            .map((v) => /name[\*]?="?(.+?)"?$/gi.exec(v))
            .reduce((a, b) => (b && b[1] ? a + b[1] : a), '');
          if (result_name) break;
        }
      }
      if (result_name) attachment.name = mimeWordsDecode(decodeURI(result_name));
      const ct = headers['Content-Type'] || headers['Content-type'];
      if (ct) attachment.contentType = ct;
      const cd = headers['Content-Disposition'];
      if (cd) attachment.inline = /^\s*inline/g.test(cd);
      attachment.data = content as Uint8Array;
      attachment.data64 = decode(content as Uint8Array, charset);
      result.attachments.push(attachment);
    }
  }

  function _read(data: ParsedEmlJson): ReadedEmlJson | Error | string {
    if (!data) return 'no data';
    try {
      const result = {} as ReadedEmlJson;
      if (!data.headers) throw new Error("data does't has headers");
      if (data.headers['Date']) result.date = new Date(data.headers['Date']);
      if (data.headers['Subject']) result.subject = unquoteString(data.headers['Subject']);
      if (data.headers['From']) result.from = getEmailAddress(data.headers['From']);
      if (data.headers['To']) result.to = getEmailAddress(data.headers['To']);
      if (data.headers['CC']) result.cc = getEmailAddress(data.headers['CC']);
      if (data.headers['Cc']) result.cc = getEmailAddress(data.headers['Cc']);
      result.headers = data.headers;

      let boundary: any = null;
      const ct = data.headers['Content-Type'] || data.headers['Content-type'];
      if (ct && /^multipart\//g.test(ct)) {
        const b = getBoundary(ct);
        if (b && b.length) boundary = b;
      }

      if (boundary && Array.isArray(data.body)) {
        for (let i = 0; i < data.body.length; i++) {
          const boundaryBlock = data.body[i];
          if (!boundaryBlock) continue;
          if (typeof boundaryBlock.part === 'undefined') {
            verbose && console.warn('Warning: undefined b.part');
          } else if (typeof boundaryBlock.part === 'string') {
            result.data = boundaryBlock.part;
          } else {
            if (typeof boundaryBlock.part.body === 'undefined') {
              verbose && console.warn('Warning: undefined b.part.body');
            } else if (typeof boundaryBlock.part.body === 'string') {
              _append(boundaryBlock.part.headers, boundaryBlock.part.body, result);
            } else {
              const currentHeaders = boundaryBlock.part.headers;
              const currentHeadersContentType = currentHeaders['Content-Type'] || currentHeaders['Content-type'];
              if (verbose) console.log(`currentHeadersContentType: ${currentHeadersContentType}`);
              if (currentHeadersContentType && currentHeadersContentType.indexOf('multipart') >= 0 && !result.multipartAlternative) {
                result.multipartAlternative = { 'Content-Type': currentHeadersContentType };
              }
              for (let j = 0; j < boundaryBlock.part.body.length; j++) {
                const selfBoundary = boundaryBlock.part.body[j];
                if (typeof selfBoundary === 'string') {
                  result.data = selfBoundary;
                  continue;
                }
                const headers = selfBoundary.part.headers;
                const content = selfBoundary.part.body;
                if (Array.isArray(content)) {
                  (content as any).forEach((bound: any) => {
                    _append(bound.part.headers, bound.part.body, result);
                  });
                } else {
                  _append(headers, content, result);
                }
              }
            }
          }
        }
      } else if (typeof data.body === 'string') {
        _append(data.headers, data.body, result);
      }
      return result;
    } catch (e) {
      return e as any;
    }
  }

  if (typeof eml === 'string') {
    const parseResult = parse(eml, options as OptionOrNull);
    if (typeof parseResult === 'string' || parseResult instanceof Error) {
      error = parseResult;
    } else {
      const readResult = _read(parseResult);
      if (typeof readResult === 'string' || readResult instanceof Error) {
        error = readResult;
      } else {
        result = readResult;
      }
    }
  } else if (typeof eml === 'object') {
    const readResult = _read(eml);
    if (typeof readResult === 'string' || readResult instanceof Error) {
      error = readResult;
    } else {
      result = readResult;
    }
  } else {
    error = new Error('Missing EML file content!');
  }
  callback && callback(error, result);
  return error || result || new Error('read EML failed!');
}

export { getEmailAddress, getCharset, unquoteString, unquotePrintable, mimeDecode, convert, encode, decode, getBoundary, completeBoundary, parse, read, GB2312UTF8 };
export { parse as parseEml, read as readEml };
export type { ParsedEmlJson, ReadedEmlJson, EmailAddress, Attachment, BoundaryHeaders, BoundaryRawData, BoundaryConvertedData, EmlHeaders, Options, OptionOrNull };
