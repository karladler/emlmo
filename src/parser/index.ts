import { parseRecursive } from './headerBodyParse';
import type { ParsedEmlJson, ReadedEmlJson, CallbackFn, OptionOrNull } from '../interface';
import { readParsed } from './readPipeline';

export { getCharset, unquoteString, unquotePrintable } from './contentDecode';
export { getEmailAddress } from './addressParse';
export { completeBoundary, parseRecursive } from './headerBodyParse';
export type { PartRecursive, Boundary } from './headerBodyParse';
export { fixInlineBodyContent } from './postprocess';
export { appendPart } from './attachmentExtract';

export { convert, encode, decode } from '../lib/charset';
export { getBoundary, mimeDecode, GB2312UTF8 } from '../utils';

/**
 * Low-level parser: raw EML string → RFC structure (headers + recursive body/boundaries).
 * Does not decode addresses, split text/html/attachments, or normalize dates.
 */
export function parse(
  eml: string,
  options?: OptionOrNull | CallbackFn<ParsedEmlJson>,
  callback?: CallbackFn<ParsedEmlJson>,
): string | Error | ParsedEmlJson {
  if (typeof options === 'function' && typeof callback === 'undefined') {
    callback = options;
    options = null;
  }
  const opts =
    typeof options === 'object' && options !== null ? options : { headersOnly: false };
  let error: string | Error | undefined;
  let result: ParsedEmlJson | undefined;
  try {
    if (typeof eml !== 'string') {
      throw new Error('Argument "eml" expected to be string!');
    }
    const lines = eml.split(/\r?\n/);
    const parent = { headers: {} } as ParsedEmlJson;
    result = parseRecursive(
      lines,
      0,
      parent as import('./headerBodyParse').PartRecursive,
      opts,
    ) as ParsedEmlJson;
  } catch (e) {
    error = e as Error;
  }

  if (callback) callback(error, result);

  return error ?? result ?? new Error('read EML failed!');
}

/**
 * High-level reader: EML string or ParsedEmlJson → normalized email object (date, subject,
 * from, to, cc, text, html, attachments). Use when you want the usual email representation.
 */
export function read(
  eml: string | ParsedEmlJson,
  options?: OptionOrNull | CallbackFn<ReadedEmlJson>,
  callback?: CallbackFn<ReadedEmlJson>,
): ReadedEmlJson | Error | string {
  if (typeof options === 'function' && typeof callback === 'undefined') {
    callback = options;
    options = null;
  }
  let error: Error | string | undefined;
  let result: ReadedEmlJson | undefined;

  if (typeof eml === 'string') {
    const parseResult = parse(eml, options as OptionOrNull);

    if (typeof parseResult === 'string' || parseResult instanceof Error) {
      error = parseResult;
    } else {
      const readResult = readParsed(parseResult);

      if (typeof readResult === 'string' || readResult instanceof Error) {
        error = readResult;
      } else {
        result = readResult;
      }
    }
  } else if (typeof eml === 'object') {
    const readResult = readParsed(eml);

    if (typeof readResult === 'string' || readResult instanceof Error) {
      error = readResult;
    } else {
      result = readResult;
    }
  } else {
    error = new Error('Missing EML file content!');
  }

  if (callback) callback(error, result);

  return error ?? result ?? new Error('read EML failed!');
}

export { parse as parseEml, read as readEml };
export type {
  ParsedEmlJson,
  ReadedEmlJson,
  EmailAddress,
  Attachment,
  BoundaryHeaders,
  BoundaryRawData,
  BoundaryConvertedData,
  EmlHeaders,
  Options,
  OptionOrNull,
} from '../interface';
