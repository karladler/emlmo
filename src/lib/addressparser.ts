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

function _handleAddress(tokens: Token[]) {
  let token;
  let isGroup = false;
  let state: keyof Data = 'text';
  let address: Address | undefined;
  const addresses = [] as Address[];
  const data: Data = {
    address: [],
    comment: [],
    group: [],
    text: [],
  };
  let i;
  let len;

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
        token.value = token.value.replace(/^[^<]*<\s*/, '');
      }
      (data[state] as string[]).push(token.value);
    }
  }

  if (!data.text.length && data.comment.length) {
    data.text = data.comment;
    data.comment = [];
  }

  if (isGroup) {
    data.text = (data.text as string[]).join(' ');
    addresses.push({
      name: data.text || (address && address.name),
      group: data.group.length ? addressparser((data.group as string[]).join(',')) : [],
    });
  } else {
    if (!data.address.length && data.text.length) {
      for (i = data.text.length - 1; i >= 0; i--) {
        if (data.text[i].match(/^[^@\s]+@[^@\s]+$/)) {
          data.address = (data.text as string[]).splice(i, 1);
          break;
        }
      }

      const _regexHandler = function (address: string) {
        if (!data.address.length) {
          data.address = [address.trim()];

          return ' ';
        } else {
          return address;
        }
      };

      if (!data.address.length) {
        for (i = data.text.length - 1; i >= 0; i--) {
          (data.text as string[])[i] = (data.text as string[])[i].replace(/\s*\b[^@\s]+@[^\s]+\b\s*/, _regexHandler).trim();

          if (data.address.length) {
            break;
          }
        }
      }
    }

    if (!data.text.length && data.comment.length) {
      data.text = data.comment;
      data.comment = [];
    }

    if (data.address.length > 1) {
      data.text = (data.text as string[]).concat((data.address as string[]).splice(1));
    }

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

export class Tokenizer {
  str: string;
  operatorCurrent: string;
  operatorExpecting: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any;
  escaped: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operators: any;
  constructor(str?: string) {
    this.str = (str || '').toString();
    this.operatorCurrent = '';
    this.operatorExpecting = '';
    this.node = null;
    this.escaped = false;

    this.list = [];
    this.operators = {
      '"': '"',
      '(': ')',
      '<': '>',
      ',': '',
      ':': ';',
      ';': '',
    };
  }

  tokenize(): Token[] {
    let chr: string;
    const list: Token[] = [];
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

  checkChar(chr: string) {
    if (this.escaped) {
      // ignore
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
      chr = ' ';
    }

    if (chr.charCodeAt(0) >= 0x21 || [' ', '\t'].includes(chr)) {
      this.node.value += chr;
    }

    this.escaped = false;
  }
}

export function addressparser(str?: string, options?: { flatten?: boolean }): { name?: string; address?: string }[] {
  options = options || {};

  const tokenizer = new Tokenizer(str);
  const tokens = tokenizer.tokenize();

  const addresses: Address[][] = [];
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
    const addresses = [] as Address[];

    const walkAddressList = (list: Address[]) => {
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
