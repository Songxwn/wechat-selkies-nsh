// Certificate problems cannot be waived from a pure-TSX nsh app: nsh's WebView
// has no certificate-error callback (the Flutter original used
// flutter_inappwebview's onReceivedServerTrustAuthRequest for this). So the app
// detects the failure and offers the paths that do work:
//   - plain HTTP, when the server listens without TLS;
//   - the system browser, which lets the user accept the certificate;
//   - trusting the certificate in the OS store (the permanent fix).

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

/**
 * The same address over plain HTTP, or null when it is already HTTP (nothing to
 * retry) or the string is not an http(s) URL.
 */
export function toPlainHttp(url: string): string | null {
  const trimmed = url.trim();
  if (/^http:\/\//i.test(trimmed)) return null;
  if (/^https:\/\//i.test(trimmed)) return `http://${trimmed.slice("https://".length)}`;
  return null;
}