// The single-connection view: one wechat-selkies page in a full-window web
// view, with optional HTTP Basic auth and a certificate help panel.

import { signal, Text, View, WebView, type WebViewRef } from "nsh";
import { NavPage } from "nsh/base";
import { TlsHelp } from "../components/TlsHelp";
import { type Connection } from "../models/connection";
import { withBasicAuth, withoutCredentials } from "../services/http";
import { openExternal } from "../services/platform";
import { httpCandidates, isCertificateError } from "../services/tls";
import { nav } from "../nav";
import { GhostButton } from "../ui/kit";

export function WebViewPage(props: { connection: Connection }) {
  const connection = props.connection;
  const title = connection.name === "" ? "微信" : connection.name;
  const loading = signal(true);
  const errorMessage = signal<string | null>(null);
  // The plain-HTTP address in use, when the user switched off TLS because this
  // platform cannot accept the certificate (see ext/tls-native).
  const plainHttp = signal<string | null>(null);
  // The web view node, for the refresh button; `src` loads the page.
  const web = signal<WebViewRef | undefined>(undefined);

  /** The address the view is about, without credentials. */
  const effectiveUrl = () => plainHttp() ?? connection.url;

  /** What the web view loads: the address with the connection's credentials. */
  const webUrl = () => withBasicAuth(effectiveUrl(), connection.username, connection.password);

  /** What the header shows: the address without the password. */
  const displayUrl = () => withoutCredentials(effectiveUrl());

  const certBlocked = () => {
    const message = errorMessage();
    return message !== null && isCertificateError(message);
  };

  /** Back to the stored address over TLS. */
  const useHttps = () => {
    plainHttp.set(null);
    errorMessage.set(null);
  };

  const handleError = (message: string) => {
    loading.set(false);
    errorMessage.set(message);
  };

  const reload = () => web()?.reload();

  const retryPlainHttp = (url: string) => {
    errorMessage.set(null);
    plainHttp.set(url);
  };

  const renderHeader = () => (
    <View class="flex-row items-center gap-3 border-b border-border bg-card/60 px-3 py-3">
      <GhostButton label="返回" onPress={() => nav.pop()} />
      <View class="min-w-[120px] flex-1">
        <Text class="text-sm font-semibold text-foreground" style={{ numberOfLines: 1 }}>
          {title}
        </Text>
        <Text class="text-xs text-muted-foreground font-mono" style={{ numberOfLines: 1 }}>
          {displayUrl()}
        </Text>
      </View>
      <If when={plainHttp() !== null}>
        <View class="rounded-full border border-cyber px-2 py-0.5">
          <Text class="text-xs font-medium text-cyber">HTTP</Text>
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
          src={webUrl()}
          style={{ flex: 1 }}
          onLoadStart={() => {
            loading.set(true);
            errorMessage.set(null);
          }}
          onLoad={() => {
            loading.set(false);
            errorMessage.set(null);
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
            onOpenExternal={() => openExternal(displayUrl())}
            onDismiss={() => errorMessage.set(null)}
          />
        </If>
      </View>
    </NavPage>
  );
}