//! Certificate handling for the app's web views.
//!
//! wechat-selkies serves HTTPS with a self-signed certificate by default, and
//! NSH's `WebView` element exposes no certificate hook: a TSX app cannot accept
//! an untrusted certificate (the Flutter original used flutter_inappwebview's
//! `onReceivedServerTrustAuthRequest`). The platform web view has to be told,
//! and only Windows lets a process do that from the outside.
//!
//! WebView2 reads `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` from the process
//! environment when its browser process starts. With
//! `--ignore-certificate-errors` it accepts untrusted certificates and keeps
//! HTTPS, so the page stays in a secure context (the clipboard that plain HTTP
//! loses keeps working). The variable has to be set before the first WebView is
//! created: `App.tsx` calls [`Tls::accept`] at import time, ahead of `mount`.
//!
//! macOS (WKWebView) and Linux (WebKitGTK) have no equivalent process-wide
//! switch, so this crate reports `false` there and the app offers the service's
//! plain-HTTP port in a certificate panel instead.

use nsh_core::prelude::*;

/// Certificate handling for the app's web views.
#[module]
pub struct Tls;

#[module]
impl Tls {
    /// Makes the app's web views accept untrusted certificates, and reports
    /// whether this platform supports it.
    ///
    /// Windows does, through WebView2's `--ignore-certificate-errors`; call this
    /// before the first web view is created. macOS and Linux return `false`, and
    /// the app falls back to its certificate panel (`HTTP` port, system browser,
    /// or a certificate in the system trust store).
    ///
    /// Set `WECHAT_SELKIES_VERIFY_TLS=1` in the environment to keep certificate
    /// verification on, for a server whose certificate is already trusted.
    pub fn accept() -> bool {
        if std::env::var_os("WECHAT_SELKIES_VERIFY_TLS").is_some() {
            return false;
        }
        accept_untrusted_certificates_platform()
    }
}

#[cfg(target_os = "windows")]
fn accept_untrusted_certificates_platform() -> bool {
    const FLAG: &str = "--ignore-certificate-errors";
    let mut arguments = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
    if !arguments.split_whitespace().any(|argument| argument == FLAG) {
        if !arguments.is_empty() {
            arguments.push(' ');
        }
        arguments.push_str(FLAG);
        // SAFETY: runs once, at app start, on the main thread, before any WebView
        // exists; nothing else reads the environment concurrently.
        unsafe { std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", arguments) };
    }
    true
}

#[cfg(not(target_os = "windows"))]
fn accept_untrusted_certificates_platform() -> bool {
    false
}

#[native_module("tls-native")]
fn native(registry: &mut Registry) {
    registry.module::<Tls>();
}