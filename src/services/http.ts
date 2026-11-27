// URL helpers shared by the web view screens: put a connection's HTTP Basic
// credentials where a browser sends them to a whole page, and keep them out of
// everything shown on screen. No `btoa`, `atob` or `TextEncoder` is used, since
// the runtime may lack them.

const SCHEME = /^([a-z][a-z0-9+.-]*:\/\/)/i;

/** `A-Z a-z 0-9 - . _ ~ ! $ & ' ( ) * + , ; =` may stay as they are. */
const USERINFO_SAFE = /[A-Za-z0-9\-._~!$&'()*+,;=]/;

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

/**
 * One part of a URL's userinfo, percent-encoded. `:` and `@` are encoded too:
 * the parser splits userinfo at the first `:` and ends it at the last `@`.
 */
export function encodeUserInfo(input: string): string {
  let output = "";
  for (const byte of utf8Bytes(input)) {
    const char = String.fromCharCode(byte);
    if (USERINFO_SAFE.test(char)) {
      output += char;
    } else {
      output += `%${byte < 0x10 ? "0" : ""}${byte.toString(16).toUpperCase()}`;
    }
  }
  return output;
}

/** The part after `scheme://`, without a userinfo it may carry. */
function withoutUserInfo(afterScheme: string): string {
  let authorityEnd = afterScheme.length;
  for (const marker of ["/", "?", "#"]) {
    const at = afterScheme.indexOf(marker);
    if (at >= 0 && at < authorityEnd) authorityEnd = at;
  }
  const authority = afterScheme.slice(0, authorityEnd);
  const at = authority.lastIndexOf("@");
  if (at < 0) return afterScheme;
  return authority.slice(at + 1) + afterScheme.slice(authorityEnd);
}

/**
 * The URL with `username:password` as its userinfo.
 *
 * A web view sends a URL's credentials with the page *and* with every
 * subresource of the same origin, while a request header set by
 * `load({ src, headers })` travels with the first request only. A
 * wechat-selkies page served behind Basic auth loads its scripts, styles and
 * `selkies-core.js` from the same auth-protected origin, so with a header the
 * document arrived and everything it needed got 401 — a blank white card.
 *
 * A URL without a scheme, or a connection without credentials, is returned as
 * it is: a password pasted into the stored address keeps working.
 */
export function withBasicAuth(url: string, username: string, password: string): string {
  const scheme = SCHEME.exec(url);
  if (!scheme) return url;
  const name = username.trim();
  if (name === "" && password === "") return url;
  const rest = withoutUserInfo(url.slice(scheme[0].length));
  return `${scheme[0]}${encodeUserInfo(name)}:${encodeUserInfo(password)}@${rest}`;
}

/** The URL without its userinfo: for display, and for opening outside the app. */
export function withoutCredentials(url: string): string {
  const scheme = SCHEME.exec(url);
  if (!scheme) return url;
  return `${scheme[0]}${withoutUserInfo(url.slice(scheme[0].length))}`;
}