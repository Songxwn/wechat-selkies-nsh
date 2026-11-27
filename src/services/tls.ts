// Certificate problems cannot be waived from TSX: nsh's WebView exposes no
// certificate-error hook (the Flutter original used flutter_inappwebview's
// onReceivedServerTrustAuthRequest), so "accept this untrusted certificate"
// has to come from the platform web view itself.
//
// That is what ext/tls-native does on Windows: WebView2 reads
// `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` from the process environment when its
// browser starts, and `--ignore-certificate-errors` makes it accept a
// self-signed certificate while keeping HTTPS (and the secure-context features,
// such as the clipboard, that plain HTTP loses). macOS and Linux have no such
// switch, so there the page offers the service's plain-HTTP port instead:
// wechat-selkies serves 3000 over HTTP beside 3001 over HTTPS.

/** Whether the app's web views accept untrusted certificates (Windows today). */
let bypassesUntrusted = false;

/** Records what the native module reported at startup. */
export function setCertificateBypass(enabled: boolean): void {
  bypassesUntrusted = enabled;
}

/** Whether untrusted certificates are accepted without asking. */
export function certificateBypass(): boolean {
  return bypassesUntrusted;
}

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
 * The plain-HTTP addresses worth trying for an https URL, best first; empty
 * when the address is already HTTP or is not an http(s) URL.
 *
 * `https://host:3001` also tries `http://host:3000`, the wechat-selkies HTTP
 * port, before the same port.
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