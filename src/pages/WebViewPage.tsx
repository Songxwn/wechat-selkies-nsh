// The single-connection view: one wechat-selkies page in a full-window web
// view, with optional HTTP Basic auth and a certificate help panel.

import { effect, signal, Text, View, WebView, type WebViewRef } from "nsh";
import { NavPage } from "nsh/base";
import { TlsHelp } from "../components/TlsHelp";
import { hasBasicAuth, type Connection } from "../models/connection";
import { basicAuthHeader } from "../services/http";
import { openExternal } from "../services/platform";
import {
  forgetHttpFallback,
  httpCandidates,
  initialUrl,
  isCertificateError,
  keepTls,
  nextHttpFallback,
  rememberHttpFallback,
} from "../services/tls";
import { nav } from "../nav";
import { GhostButton } from "../ui/kit";

export function WebViewPage(props: { connection: Connection }) {
  const connection = props.connection;
  const title = connection.name === "" ? "微信" : connection.name;
  const loading = signal(true);
  const errorMessage = signal<string | null>(null);
  // Auto-picked plain-HTTP address: known before the first load (a remembered
  // fallback, or wechat-selkies' self-signed 3001), or after a certificate error.
  const firstUrl = initialUrl(connection.url);
  const startsOnHttp = /^http:\/\//i.test(firstUrl);
  const plainHttp = signal<string | null>(startsOnHttp ? firstUrl : null);
  const autoSwitched = signal(startsOnHttp);
  let tried: string[] = [];
  let reverted = false;
  let httpLoaded = false;
  let web!: WebViewRef;

  const effectiveUrl = () => plainHttp() ?? connection.url;

  const certBlocked = () => {
    const message = errorMessage();
    return message !== null && isCertificateError(message);
  };

  const onHttpFallback = () => plainHttp() !== null || initialUrl(connection.url) !== connection.url;

  /** Refuse the downgrade: stay on TLS for this address from now on. */
  const useHttps = () => {
    keepTls(connection.url);
    forgetHttpFallback(connection.url);
    plainHttp.set(null);
    autoSwitched.set(false);
    errorMessage.set(null);
    tried = [];
    reverted = false;
  };

  /**
   * Handles a failed load. An untrusted certificate is bypassed without asking
   * by switching to the next plain-HTTP address; the panel appears only when
   * every candidate has been tried.
   */
  const handleError = (message: string) => {
    loading.set(false);

    if (isCertificateError(message)) {
      const next = nextHttpFallback(connection.url, tried);
      if (next !== null) {
        tried = [...tried, next];
        rememberHttpFallback(connection.url, next);
        autoSwitched.set(true);
        errorMessage.set(null);
        plainHttp.set(next);
        return;
      }
      errorMessage.set(message);
      return;
    }

    if (onHttpFallback() && !reverted && !httpLoaded) {
      reverted = true;
      keepTls(connection.url);
      forgetHttpFallback(connection.url);
      plainHttp.set(null);
      autoSwitched.set(false);
      errorMessage.set(null);
      return;
    }

    errorMessage.set(message);
  };

  // nsh's WebView sends custom request headers through `load({ src, headers })`
  // (the `src` prop takes no headers), so a Basic-auth page is loaded once here,
  // and `src` stays empty so the page is not requested twice.
  const headers = hasBasicAuth(connection)
    ? { Authorization: basicAuthHeader(connection.username, connection.password) }
    : null;

  const reload = () => {
    if (headers) web?.load({ src: effectiveUrl(), headers });
    else web?.reload();
  };

  const retryPlainHttp = (url: string) => {
    tried = [...tried, url];
    rememberHttpFallback(connection.url, url);
    autoSwitched.set(false);
    reverted = false;
    errorMessage.set(null);
    plainHttp.set(url);
  };

  if (headers) {
    effect(() => {
      if (web) web.load({ src: effectiveUrl(), headers });
    });
  }

  const renderHeader = () => (
    <View class="flex-row items-center gap-3 border-b border-border bg-card/60 px-3 py-3">
      <GhostButton label="返回" onPress={() => nav.pop()} />
      <View class="min-w-[120px] flex-1">
        <Text class="text-sm font-semibold text-foreground" style={{ numberOfLines: 1 }}>
          {title}
        </Text>
        <Text class="text-xs text-muted-foreground font-mono" style={{ numberOfLines: 1 }}>
          {effectiveUrl()}
        </Text>
      </View>
      <If when={plainHttp() !== null}>
        <View class="rounded-full border border-cyber px-2 py-0.5">
          <Text class="text-xs font-medium text-cyber">{autoSwitched() ? "自动 HTTP" : "HTTP"}</Text>
        </View>
      </If>
      <If when={plainHttp() !== null}>
        <GhostButton label="切回 HTTPS" onPress={useHttps} />
      </If>
      <GhostButton label="刷新" onPress={reload} />
    </View>
  );

  return (
    <NavPage class="flex-1" title={title} header={renderHeader()}>
      <View class="relative flex-1 bg-background">
        <If when={loading()}>
          <View class="absolute left-0 right-0 top-0 z-10 h-0.5 bg-cyber animate-pulse" />
        </If>
        <WebView
          ref={web}
          src={headers ? undefined : effectiveUrl()}
          style={{ flex: 1 }}
          onLoadStart={() => {
            loading.set(true);
            errorMessage.set(null);
          }}
          onLoad={() => {
            loading.set(false);
            errorMessage.set(null);
            if (plainHttp() !== null) httpLoaded = true;
          }}
          onError={({ message }) => handleError(message)}
          ios={{ allowsBackForwardNavigationGestures: true }}
          desktop={{ allowsBackForwardNavigationGestures: true }}
        />
        <If when={certBlocked()}>
          <TlsHelp
            message={errorMessage() ?? ""}
            httpUrls={httpCandidates(connection.url)}
            onRetryHttp={retryPlainHttp}
            onOpenExternal={() => openExternal(effectiveUrl())}
            onDismiss={() => errorMessage.set(null)}
          />
        </If>
      </View>
    </NavPage>
  );
}