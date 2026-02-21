export const encode = (str: string, _fromCharset = 'utf-8'): Uint8Array => new TextEncoder().encode(str);

const CHUNK_SZ = 0x8000;

export const arr2str = (arr: Uint8Array): string => {
	const parts: string[] = [];
	for (let i = 0; i < arr.length; i += CHUNK_SZ) {
		const chunk = arr.subarray(i, i + CHUNK_SZ);
		parts.push(Array.from(chunk, (b) => String.fromCharCode(b)).join(''));
	}
	return parts.join('');
};

/**
 * Decodes a string from Uint8Array to an unicode string using specified encoding
 *
 * @param {Uint8Array|String} buf Binary data to be decoded or string to return as-is
 * @param {String} fromCharset Encoding to decode from (ignored if buf is already a string)
 * @return {String} Decoded string
 */
export function decode(buf: Uint8Array | string, fromCharset = 'utf-8'): string {
	if (typeof buf === 'string') return buf;
	const charsets = [
		{ charset: normalizeCharset(fromCharset), fatal: false },
		{ charset: 'utf-8', fatal: true },
		{ charset: 'iso-8859-15', fatal: false },
	];

	for (const { charset, fatal } of charsets) {
		try {
			return new TextDecoder(charset, { fatal }).decode(buf);
			// eslint-disable-next-line no-empty
		} catch (e) {}
	}

	return arr2str(buf); // all else fails, treat it as binary
}

/**
 * Convert a string from specific encoding to UTF-8 Uint8Array
 *
 * @param {String|Uint8Array} data Data to be encoded
 * @param {String} Source encoding for the string (optional for data of type String)
 * @return {Uint8Array} UTF-8 encoded typed array
 */
export const convert = (data: string | Uint8Array, fromCharset?: string | undefined): Uint8Array =>
	typeof data === 'string' ? encode(data) : encode(decode(data, fromCharset));

function normalizeCharset(charset = 'utf-8'): string {
	const utf = charset.match(/^utf[-_]?(\d+)$/i);
	if (utf) return 'UTF-' + utf[1];
	const win = charset.match(/^win[-_]?(\d+)$/i);
	if (win) return 'WINDOWS-' + win[1];
	const latin = charset.match(/^latin[-_]?(\d+)$/i);
	if (latin) return 'ISO-8859-' + latin[1];
	return charset;
}
