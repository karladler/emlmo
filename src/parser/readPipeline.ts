import { getBoundary } from '../utils';
import type { ParsedEmlJson, ReadedEmlJson } from '../interface';
import type { PartRecursive, Boundary } from './headerBodyParse';
import { getEmailAddress } from './addressParse';
import { unquoteString } from './contentDecode';
import { appendPart } from './attachmentExtract';
import { fixInlineBodyContent } from './postprocess';

const verbose = false;

function walkPart(
  part: PartRecursive,
  result: ReadedEmlJson,
): void {
  const body = part.body;

  if (typeof body === 'string') {
    appendPart(part.headers!, body, result);

    return;
  }

  if (!Array.isArray(body)) return;

  for (let j = 0; j < body.length; j++) {
    const block = body[j];

    if (typeof block === 'string') {
      result.data = block;
      continue;
    }
    const b = block as Boundary;
    const headers = b.part?.headers;
    const content = b.part?.body;

    if (!headers) continue;

    if (Array.isArray(content)) {
      content.forEach((bound: Boundary) => {
        if (bound?.part) appendPart(bound.part.headers!, bound.part.body as string, result);
      });
    } else if (content !== undefined) {
      appendPart(headers, content, result);
    }
  }
}

export function readParsed(data: ParsedEmlJson): ReadedEmlJson | Error | string {
  if (!data) return 'no data';
  try {
    const result = {} as ReadedEmlJson;

    if (!data.headers) throw new Error('data doesn\'t have headers');

    if (data.headers['Date']) result.date = new Date(String(data.headers['Date']));

    if (data.headers['Subject']) result.subject = unquoteString(String(data.headers['Subject']));

    if (data.headers['From']) result.from = getEmailAddress(String(data.headers['From']));

    if (data.headers['To']) result.to = getEmailAddress(String(data.headers['To']));

    if (data.headers['CC']) result.cc = getEmailAddress(String(data.headers['CC']));

    if (data.headers['Cc']) result.cc = getEmailAddress(String(data.headers['Cc']));
    result.headers = data.headers;

    const ct = data.headers['Content-Type'] || data.headers['Content-type'];
    const ctStr = typeof ct === 'string' ? ct : Array.isArray(ct) ? ct[0] : '';
    const boundary =
      ctStr && /^multipart\//.test(ctStr) ? getBoundary(ctStr) : undefined;

    if (boundary && Array.isArray(data.body)) {
      for (let i = 0; i < data.body.length; i++) {
        const boundaryBlock = data.body[i];

        if (!boundaryBlock) continue;
        const part = (boundaryBlock as Boundary).part;

        if (part === undefined) {
          if (verbose) console.warn('Warning: undefined b.part');
          continue;
        }

        if (typeof part === 'string') {
          result.data = part;
          continue;
        }

        if (part.body === undefined) {
          if (verbose) console.warn('Warning: undefined b.part.body');
          continue;
        }

        if (typeof part.body === 'string') {
          appendPart(part.headers!, part.body, result);
        } else {
          const currentCt =
            part.headers!['Content-Type'] || part.headers!['Content-type'];
          const ctMultipart =
            typeof currentCt === 'string'
              ? currentCt
              : Array.isArray(currentCt)
                ? currentCt[0]
                : '';

          if (verbose) console.log(`currentHeadersContentType: ${ctMultipart}`);

          if (
            ctMultipart?.indexOf('multipart') >= 0 &&
            !result.multipartAlternative
          ) {
            result.multipartAlternative = { 'Content-Type': ctMultipart };
          }
          walkPart(part, result);
        }
      }
    } else if (typeof data.body === 'string') {
      appendPart(data.headers, data.body, result);
    }

    return fixInlineBodyContent(result);
  } catch (e) {
    return e as Error;
  }
}
