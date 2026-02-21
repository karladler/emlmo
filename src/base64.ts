export function base64Decode(str: string): string {
	return typeof atob !== 'undefined' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
}

export function base64Encode(str: string): string {
	return typeof btoa !== 'undefined' ? btoa(str) : Buffer.from(str, 'binary').toString('base64');
}

export function base64ToUint8Array(str: string): Uint8Array {
	if (typeof Buffer !== 'undefined') {
		return new Uint8Array(Buffer.from(str, 'base64'));
	}
	const binary = base64Decode(str);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
