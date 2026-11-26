// The single-connection view: one wechat-selkies page in a full-window web
// view, with optional HTTP Basic auth and a certificate help panel.

import { effect, signal, Text, View, WebView, type WebViewRef } from "nsh";
import { NavPage } from "nsh/base";
import { TlsHelp } from "../components/TlsHelp";
import { hasBasicAuth, type Connection } from "../models/connection";
import { basicAuthHeader } from "../services/http";
import { openExternal } from "../services/platform";
import { isCertificateError, httpCandidates } from "../services/tls";
import { nav } from "../nav";
import { GhostButton } from "../ui/kit";

export function WebViewPage(props: { connection: Connection }) {
  const connection = props.connection;
  const title = connection.name === "" ? "微信" : connection.name;
  const loading = signal(true);
  const errorMessage = signal<string | null>(null);
  const plainHttp = signal<string | null>(null);
  let web!: WebViewRef;

  const effectiveUrl = () => plainHttp() ?? connection.url;

  const certBlocked = () => {
    const message = errorMessage();
    return message !== null && isCertificateError(message);
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
          }}
          onError={({ message }) => {
            loading.set(false);
            errorMessage.set(message);
          }}
          ios={{ allowsBackForwardNavigationGestures: true }}
          desktop={{ allowsBackForwardNavigationGestures: true }}
        />
        <If when={certBlocked()}>
          <TlsHelp
            message={errorMessage() ?? ""}
            httpUrls={httpCandidates(effectiveUrl())}
            onRetryHttp={retryPlainHttp}
            onOpenExternal={() => openExternal(effectiveUrl())}
            onDismiss={() => errorMessage.set(null)}
          />
        </If>
      </View>
    </NavPage>
  );
}