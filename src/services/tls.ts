// Certificate problems cannot be waived from a pure-TSX nsh app: nsh's WebView
// has no certificate-error callback (the Flutter original used
// flutter_inappwebview's onReceivedServerTrustAuthRequest for this).
//
// wechat-selkies serves the same UI over plain HTTP on port 3000 and HTTPS on
// port 3001 (its compose maps `HTTP_PORT:-3000` next to `HTTPS_PORT:-3001`), so
// the direct way past a self-signed certificate is to use the HTTP port: no TLS,
// nothing to verify. The helpers below rewrite an https address to the HTTP
// ones worth trying, in order.

interface HostPort {
  host: string;
  port: string | null;
}

function parseHostPort(url: string): HostPort | null {
  const match = /^https?:\/\/([^/?#]+)/i.exec(url.trim());
  if (!match) return null;
  let authority = match[1];
  const at = authority.lastIndexOf("@");
  if (at >= 0) authority = authority.slice(at + 1);

  // IPv6 literals keep their brackets: [::1]:3001.
  const v6 = /^(\[[^\]]+\])(?::(\d+))?$/.exec(authority);
  if (v6) return { host: v6[1], port: v6[2] ?? null };

  const colon = authority.lastIndexOf(":");
  if (colon > 0 && /^\d+$/.test(authority.slice(colon + 1))) {
    return { host: authority.slice(0, colon), port: authority.slice(colon + 1) };
  }
  return { host: authority, port: null };
}

/**
 * The plain-HTTP addresses to try for an https URL, best first; empty when the
 * address is already HTTP or is not an http(s) URL.
 *
 * `https://host:3001` also tries `http://host:3000`, the wechat-selkies HTTP
 * port, before retrying the same port.
 */
export function httpCandidates(url: string): string[] {
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return [];
  const hp = parseHostPort(trimmed);
  if (hp === null) return [];

  // Keep the path and query, drop the authority.
  const rest = trimmed.replace(/^https:\/\/[^/?#]+/i, "");
  const out: string[] = [];
  if (hp.port === "3001") out.push(`http://${hp.host}:3000${rest}`);
  out.push(`http://${hp.host}${hp.port === null ? "" : `:${hp.port}`}${rest}`);
  return Array.from(new Set(out));
}

/** The first plain-HTTP candidate, or null when there is none. */
export function toPlainHttp(url: string): string | null {
  const candidates = httpCandidates(url);
  return candidates.length === 0 ? null : candidates[0];
}

/** Whether a WebView error message describes an untrusted/invalid certificate. */
export function isCertificateError(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("certificat") ||
    text.includes("ssl") ||
    text.includes("tls") ||
    text.includes("self-signed") ||
    text.includes("self signed") ||
    text.includes("not trusted") ||
    text.includes("err_cert")
  );
}