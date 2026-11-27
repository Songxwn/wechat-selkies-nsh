// Certificate problems cannot be waived from a pure-TSX nsh app: nsh's WebView
// has no certificate-error callback (the Flutter original used
// flutter_inappwebview's onReceivedServerTrustAuthRequest for this).
//
// wechat-selkies serves the same UI over plain HTTP on port 3000 and HTTPS on
// port 3001 (its compose maps `HTTP_PORT:-3000` next to `HTTPS_PORT:-3001`), so
// the direct way past a self-signed certificate is to use the HTTP port: no TLS,
// nothing to verify. The helpers below rewrite an https address to the HTTP
// addresses worth trying, in order; choose the address a connection should start
// on so the failure never happens; and remember the address that worked.

import { Storage } from "nsh";

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

/** The next plain-HTTP address worth trying, skipping ones already attempted. */
export function nextHttpFallback(url: string, tried: readonly string[]): string | null {
  for (const candidate of httpCandidates(url)) {
    if (!tried.includes(candidate)) return candidate;
  }
  return null;
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

/** `scheme://host[:port]`, lower-cased, or null for a non-http(s) URL. */
export function originOf(url: string): string | null {
  const match = /^(https?):\/\/([^/?#]+)/i.exec(url.trim());
  if (!match) return null;
  return `${match[1].toLowerCase()}://${match[2].toLowerCase()}`;
}

// what the app remembers about certificates: the HTTP origin that served an
// HTTPS one, and the origins the user asked to keep on TLS. Kept in memory for
// the session and persisted, so the next launch starts on the working address.
const PREFS_KEY = "tlsPrefs";
let fallbackOrigins: Record<string, string> = {};
let tlsOnlyOrigins: string[] = [];

interface TlsPrefs {
  fallbacks: Record<string, string>;
  tlsOnly: string[];
}

function prefs(): TlsPrefs {
  return { fallbacks: fallbackOrigins, tlsOnly: tlsOnlyOrigins };
}

/** Reads the remembered preferences; safe to call more than once. */
export async function loadTlsPrefs(): Promise<void> {
  try {
    const raw = await Storage.getItem(PREFS_KEY);
    if (raw === null || raw === "") return;
    const decoded: unknown = JSON.parse(raw);
    if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) return;
    const saved = decoded as { fallbacks?: unknown; tlsOnly?: unknown };

    if (saved.fallbacks !== null && typeof saved.fallbacks === "object" && !Array.isArray(saved.fallbacks)) {
      for (const [from, to] of Object.entries(saved.fallbacks as Record<string, unknown>)) {
        if (typeof to !== "string") continue;
        if (!/^https:\/\//i.test(from) || !/^http:\/\//i.test(to)) continue;
        fallbackOrigins[from.toLowerCase()] = to.toLowerCase();
      }
    }
    if (Array.isArray(saved.tlsOnly)) {
      tlsOnlyOrigins = saved.tlsOnly.filter(
        (origin): origin is string => typeof origin === "string" && /^https:\/\//i.test(origin),
      ).map((origin) => origin.toLowerCase());
    }
  } catch {
    // A corrupt entry only costs one failed load; the fallback re-learns it.
  }
}

function persistPrefs(): void {
  try {
    Storage.setItem(PREFS_KEY, JSON.stringify(prefs())).catch(() => {
      // Losing the memory is harmless: the next load just re-detects the fallback.
    });
  } catch {
    // Same as above: storage unavailable only costs one extra failed load.
  }
}

/** Remembers that `httpUrl` served the same page as `httpsUrl`, without TLS. */
export function rememberHttpFallback(httpsUrl: string, httpUrl: string): void {
  const from = originOf(httpsUrl);
  const to = originOf(httpUrl);
  if (from === null || to === null || from === to) return;
  if (!from.startsWith("https://") || !to.startsWith("http://")) return;
  if (fallbackOrigins[from] === to) return;
  fallbackOrigins = { ...fallbackOrigins, [from]: to };
  persistPrefs();
}

/** Forgets the remembered fallback for an https origin. */
export function forgetHttpFallback(httpsUrl: string): void {
  const from = originOf(httpsUrl);
  if (from === null || fallbackOrigins[from] === undefined) return;
  const next = { ...fallbackOrigins };
  delete next[from];
  fallbackOrigins = next;
  persistPrefs();
}

/** Whether a remembered fallback applies to this address. */
export function hasHttpFallback(url: string): boolean {
  const from = originOf(url);
  return from !== null && fallbackOrigins[from] !== undefined;
}

/** Keeps an https origin on TLS: "切回 HTTPS" and a failed HTTP retry set it. */
export function keepTls(url: string): void {
  const from = originOf(url);
  if (from === null || !from.startsWith("https://")) return;
  if (tlsOnlyOrigins.includes(from)) return;
  tlsOnlyOrigins = [...tlsOnlyOrigins, from];
  persistPrefs();
}

/** Whether the user asked to keep this origin on TLS. */
export function isTlsOnly(url: string): boolean {
  const from = originOf(url);
  return from !== null && tlsOnlyOrigins.includes(from);
}

/** The address a remembered fallback maps this URL to, or the URL unchanged. */
export function preferredUrl(url: string): string {
  const from = originOf(url);
  if (from === null) return url;
  const httpOrigin = fallbackOrigins[from];
  if (httpOrigin === undefined) return url;
  return httpOrigin + url.trim().replace(/^https?:\/\/[^/?#]+/i, "");
}

/**
 * The address to load first for a stored URL, so a self-signed certificate is
 * bypassed without waiting for a failure.
 *
 * 1. A remembered HTTP origin wins.
 * 2. `https://host:3001` starts on `http://host:3000`: that pair is
 *    wechat-selkies' own default (HTTP 3000 beside HTTPS 3001), and the HTTPS
 *    side is a self-signed certificate unless the user replaced it.
 * 3. Anything else keeps its URL.
 *
 * "切回 HTTPS" (`keepTls`) turns 2 off for that origin for good.
 */
export function initialUrl(url: string): string {
  const remembered = preferredUrl(url);
  if (remembered !== url) return remembered;

  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return url;
  const hp = parseHostPort(trimmed);
  if (hp === null || hp.port !== "3001") return url;
  if (isTlsOnly(trimmed)) return url;

  const rest = trimmed.replace(/^https?:\/\/[^/?#]+/i, "");
  return `http://${hp.host}:3000${rest}`;
}

/** Whether `initialUrl` takes this address off TLS. */
export function autoHttp(url: string): boolean {
  return initialUrl(url) !== url;
}