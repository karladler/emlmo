/**
 * @author superchow
 * @emil superchow@live.cn
 */

import { read } from './parser';
import { build } from './builder';
import type { ReadedEmlJson, BuildOptions, CallbackFn } from './interface';

function buildEml(
	data: ReadedEmlJson | string,
	options?: BuildOptions | CallbackFn<string> | null,
	callback?: CallbackFn<string>,
): string | Error {
	if (typeof data === 'string') {
		const readResult = read(data);
		if (typeof readResult === 'string' || readResult instanceof Error) return readResult;
		data = readResult;
	}
	return build(data, options, callback);
}

export {
	getEmailAddress,
	getCharset,
	unquoteString,
	unquotePrintable,
	mimeDecode,
	convert,
	encode,
	decode,
	getBoundary,
	completeBoundary,
	GB2312UTF8,
} from './parser';
export { parse as parseEml, read as readEml } from './parser';
export { GB2312UTF8 as GBKUTF8 } from './parser';
export { toEmailAddress, createBoundary } from './builder';
export { buildEml };
export type { ParsedEmlJson, ReadedEmlJson, EmailAddress, Attachment, BoundaryHeaders } from './parser';
