// HTTP helpers shared by the web view screens: build a Basic auth header
// without relying on `btoa`, `atob` or `TextEncoder` (the runtime may lack them).

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** The UTF-8 bytes of a string (the runtime may not provide `TextEncoder`). */
export function utf8Bytes(input: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && index + 1 < input.length) {
      const next = input.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const point = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        bytes.push(
          0xf0 | (point >> 18),
          0x80 | ((point >> 12) & 0x3f),
          0x80 | ((point >> 6) & 0x3f),
          0x80 | (point & 0x3f),
        );
        index += 1;
        continue;
      }
      bytes.push(0xef, 0xbf, 0xbd); // unpaired surrogate: U+FFFD
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

/** Standard base64 of a string's UTF-8 bytes, without relying on `btoa`. */
export function toBase64(input: string): string {
  const bytes = utf8Bytes(input);
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const has1 = index + 1 < bytes.length;
    const has2 = index + 2 < bytes.length;
    const b0 = bytes[index];
    const b1 = has1 ? bytes[index + 1] : 0;
    const b2 = has2 ? bytes[index + 2] : 0;
    output += BASE64_ALPHABET[b0 >> 2];
    output += BASE64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    output += has1 ? BASE64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : "=";
    output += has2 ? BASE64_ALPHABET[b2 & 0x3f] : "=";
  }
  return output;
}

/** `Basic <base64(user:pass)>`, matching the original Flutter app's header. */
export function basicAuthHeader(username: string, password: string): string {
  return `Basic ${toBase64(`${username.trim()}:${password}`)}`;
}
