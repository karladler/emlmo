interface Token {
	type: string;
	value: string;
}
interface Address {
	name?: string;
	address?: string;
	group?: Address[];
}
interface Data {
	address: string[] | string;
	comment: string[] | string;
	group: Address[];
	text: string | string[]; // TODO: use text and textArray instead
}

/**
 * Converts tokens for a single address into an address object
 *
 * @param {Array} tokens Tokens object
 * @return {Object} Address object
 */
function _handleAddress(tokens: Token[]) {
	let token;
	let isGroup = false;
	let state: keyof Data = 'text';
	let address: Address | undefined;
	let addresses = [] as Address[];
	let data: Data = {
		address: [],
		comment: [],
		group: [],
		text: [],
	};
	let i;
	let len;

	// Filter out <addresses>, (comments) and regular text
	for (i = 0, len = tokens.length; i < len; i++) {
		token = tokens[i];
		if (token.type === 'operator') {
			switch (token.value) {
				case '<':
					state = 'address';
					break;
				case '(':
					state = 'comment';
					break;
				case ':':
					state = 'group';
					isGroup = true;
					break;
				default:
					state = 'text';
			}
		} else if (token.value) {
			if (state === 'address') {
				// handle use case where unquoted name includes a "<"
				// Apple Mail truncates everything between an unexpected < and an address
				// and so will we
				token.value = token.value.replace(/^[^<]*<\s*/, '');
			}
			(data[state] as string[]).push(token.value);
		}
	}

	// If there is no text but a comment, replace the two
	if (!data.text.length && data.comment.length) {
		data.text = data.comment;
		data.comment = [];
	}

	if (isGroup) {
		// http://tools.ietf.org/html/rfc2822#appendix-A.1.3
		data.text = (data.text as string[]).join(' ');
		addresses.push({
			name: data.text || (address && address.name),
			group: data.group.length ? addressparser((data.group as string[]).join(',')) : [],
		});
	} else {
		// If no address was found, try to detect one from regular text
		if (!data.address.length && data.text.length) {
			for (i = data.text.length - 1; i >= 0; i--) {
				if (data.text[i].match(/^[^@\s]+@[^@\s]+$/)) {
					data.address = (data.text as string[]).splice(i, 1);
					break;
				}
			}

			let _regexHandler = function (address: string) {
				if (!data.address.length) {
					data.address = [address.trim()];
					return ' ';
				} else {
					return address;
				}
			};

			// still no address
			if (!data.address.length) {
				for (i = data.text.length - 1; i >= 0; i--) {
					// TODO: validate replacement, check with unit tests
					// fixed the regex to parse email address correctly when email address has more than one @
					(data.text as string[])[i] = (data.text as string[])[i].replace(/\s*\b[^@\s]+@[^\s]+\b\s*/, _regexHandler).trim();
					if (data.address.length) {
						break;
					}
				}
			}
		}

		// If there's still is no text but a comment exixts, replace the two
		if (!data.text.length && data.comment.length) {
			data.text = data.comment;
			data.comment = [];
		}

		// Keep only the first address occurence, push others to regular text
		if (data.address.length > 1) {
			data.text = (data.text as string[]).concat((data.address as string[]).splice(1));
		}

		// Join values with spaces
		data.text = (data.text as string[]).join(' ');
		data.address = (data.address as string[]).join(' ');

		if (!data.address && isGroup) {
			return [];
		} else {
			address = {
				address: data.address || data.text || '',
				name: data.text || data.address || '',
			};

			if (address.address === address.name) {
				if ((address.address || '').match(/@/)) {
					address.name = '';
				} else {
					address.address = '';
				}
			}

			addresses.push(address);
		}
	}

	return addresses;
}

/**
 * Creates a Tokenizer object for tokenizing address field strings
 *
 * @constructor
 * @param {String} str Address field string
 */
export class Tokenizer {
	str: string;
	operatorCurrent: string;
	operatorExpecting: string;
	node: any;
	escaped: boolean;
	list: any[];
	operators: any;
	constructor(str?: string) {
		this.str = (str || '').toString();
		this.operatorCurrent = '';
		this.operatorExpecting = '';
		this.node = null;
		this.escaped = false;

		this.list = [];
		/**
     * Operator tokens and which tokens are expected to end the sequence
     */
		this.operators = {
			'"': '"',
			'(': ')',
			'<': '>',
			',': '',
			':': ';',
			// Semicolons are not a legal delimiter per the RFC2822 grammar other
			// than for terminating a group, but they are also not valid for any
			// other use in this context.  Given that some mail clients have
			// historically allowed the semicolon as a delimiter equivalent to the
			// comma in their UI, it makes sense to treat them the same as a comma
			// when used outside of a group.
			';': '',
		};
	}

	/**
   * Tokenizes the original input string
   *
   * @return {Array} An array of operator|text tokens
   */
	tokenize(): Token[] {
		let chr,
			list: Token[] = [];
		for (let i = 0, len = this.str.length; i < len; i++) {
			chr = this.str.charAt(i);
			this.checkChar(chr);
		}

		this.list.forEach((node) => {
			node.value = (node.value || '').toString().trim();
			if (node.value) {
				list.push(node);
			}
		});

		return list;
	}

	/**
   * Checks if a character is an operator or text and acts accordingly
   *
   * @param {String} chr Character from the address field
   */
	checkChar(chr: string) {
		if (this.escaped) {
			// ignore next condition blocks
		} else if (chr === this.operatorExpecting) {
			this.node = {
				type: 'operator',
				value: chr,
			};
			this.list.push(this.node);
			this.node = null;
			this.operatorExpecting = '';
			this.escaped = false;
			return;
		} else if (!this.operatorExpecting && chr in this.operators) {
			this.node = {
				type: 'operator',
				value: chr,
			};
			this.list.push(this.node);
			this.node = null;
			this.operatorExpecting = this.operators[chr];
			this.escaped = false;
			return;
		} else if (['"', '\''].includes(this.operatorExpecting) && chr === '\\') {
			this.escaped = true;
			return;
		}

		if (!this.node) {
			this.node = {
				type: 'text',
				value: '',
			};
			this.list.push(this.node);
		}

		if (chr === '\n') {
			// Convert newlines to spaces. Carriage return is ignored as \r and \n usually
			// go together anyway and there already is a WS for \n. Lone \r means something is fishy.
			chr = ' ';
		}

		if (chr.charCodeAt(0) >= 0x21 || [' ', '\t'].includes(chr)) {
			// skip command bytes
			this.node.value += chr;
		}

		this.escaped = false;
	}
}

/**
 * Parses structured e-mail addresses from an address field
 *
 * Example:
 *
 *    'Name <address@domain>'
 *
 * will be converted to
 *
 *     [{name: 'Name', address: 'address@domain'}]
 *
 * @param {String} str Address field
 * @return {Array} An array of address objects
 */
export function addressparser(str?: string, options?: { flatten?: boolean }): { name?: string; address?: string }[] {
	options = options || {};

	let tokenizer = new Tokenizer(str);
	let tokens = tokenizer.tokenize();

	let addresses: Address[][] = [];
	let addressOrToken: Token[] | Address[] = [];
	let parsedAddresses: Address[] = [];

	tokens.forEach((token) => {
		if (token.type === 'operator' && (token.value === ',' || token.value === ';')) {
			if (Array.isArray(addressOrToken) && addressOrToken.length) {
				addresses.push(addressOrToken as Address[]);
			}
			addressOrToken = [];
		} else {
			addressOrToken.push(token);
		}
	});

	if (addressOrToken.length) {
		addresses.push(addressOrToken as Address[]);
	}

	addresses.forEach((address) => {
		address = _handleAddress(address as Token[]);
		if (address.length) {
			parsedAddresses = parsedAddresses.concat(address);
		}
	});

	if (options.flatten) {
		let addresses = [] as Address[];

		let walkAddressList = (list: any[]) => {
			list.forEach((address) => {
				if (address.group) {
					return walkAddressList(address.group);
				} else {
					addresses.push(address);
				}
			});
		};
		walkAddressList(parsedAddresses);
		return addresses;
	}

	return parsedAddresses;
}
