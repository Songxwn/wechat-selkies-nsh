// One card of the preview wall: a live, in-app web view for a single
// connection, plus its name, status and actions. Several tiles render at once,
// so the user can watch multiple WeChat instances side by side.

import { effect, signal, Text, View, WebView, type WebViewRef } from "nsh";
import { Button } from "nsh/base";
import { hasBasicAuth, type Connection } from "../models/connection";
import { basicAuthHeader } from "../services/http";
import { openExternal, supportsInAppWebView } from "../services/platform";
import {
  forgetHttpFallback,
  httpCandidates,
  initialUrl,
  isCertificateError,
  keepTls,
  nextHttpFallback,
  rememberHttpFallback,
} from "../services/tls";
import { DangerButton, GhostButton, StatusDot } from "../ui/kit";
import { TlsHelp } from "./TlsHelp";

/** Why the tile is not showing a live preview. */
function placeholderReason(connection: Connection, previewEnabled: boolean): string {
  if (connection.openExternal) return "已设为系统浏览器打开";
  if (!supportsInAppWebView()) return "当前平台不支持应用内预览";
  if (!previewEnabled) return "预览已关闭";
  return "";
}

function Placeholder(props: { reason: string; onOpen: () => void }) {
  return (
    <View class="flex-1 items-center justify-center gap-2 bg-muted">
      <Text class="text-3xl text-muted-foreground/40 font-mono">{"</>"}</Text>
      <Text class="text-xs text-muted-foreground">{props.reason}</Text>
      <Button onPress={props.onOpen} class="rounded-(--radius) px-2 py-1 active:opacity-70">
        <Text class="text-xs font-medium text-primary">进入 →</Text>
      </Button>
    </View>
  );
}

export function PreviewTile(props: {
  connection: () => Connection;
  isDefault: () => boolean;
  refreshToken: () => number;
  previewEnabled: () => boolean;
  previewHeight: () => number;
  onOpen: () => void;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const loading = signal(false);
  const live = signal(false);
  const errorMessage = signal<string | null>(null);
  // The plain-HTTP address in use: picked before the first load when the address
// is known to need it, or automatically after a certificate error.
  const firstUrl = initialUrl(props.connection().url);
  const startsOnHttp = /^http:\/\//i.test(firstUrl);
  const plainHttp = signal<string | null>(startsOnHttp ? firstUrl : null);
  const autoSwitched = signal(startsOnHttp);
  // Plain-HTTP addresses already attempted for this card.
  let tried: string[] = [];
  // Guards the single "least surprising" revert from a broken HTTP fallback.
  let reverted = false;
  // Whether the plain-HTTP address ever loaded; if not, the port is closed.
  let httpLoaded = false;
  let web: WebViewRef | undefined;

  const canPreview = () =>
    props.previewEnabled() && supportsInAppWebView() && !props.connection().openExternal;

  /** The address the tile shows. */
  const effectiveUrl = () => plainHttp() ?? props.connection().url;

  /** Whether the tile is currently off TLS, by choice or from memory. */
  const onHttpFallback = () => plainHttp() !== null || initialUrl(props.connection().url) !== props.connection().url;

  /** Refuse the downgrade: stay on TLS for this address from now on. */
  const useHttps = () => {
    keepTls(props.connection().url);
    forgetHttpFallback(props.connection().url);
    plainHttp.set(null);
    autoSwitched.set(false);
    errorMessage.set(null);
    tried = [];
    reverted = false;
  };

  /**
   * A failed load. An untrusted certificate is handled without asking: switch
   * to the next plain-HTTP address, remember it, and load again. Only when every
   * candidate is exhausted does the certificate panel appear.
   */
  const handleError = (message: string) => {
    loading.set(false);
    live.set(false);

    if (isCertificateError(message)) {
      const next = nextHttpFallback(props.connection().url, tried);
      if (next !== null) {
        tried = [...tried, next];
        rememberHttpFallback(props.connection().url, next);
        autoSwitched.set(true);
        errorMessage.set(null);
        plainHttp.set(next);
        return;
      }
      errorMessage.set(message);
      return;
    }

    // The HTTP address did not work either (port closed, wrong host): go back
    // to TLS and stop pre-empting it, so the panel explains instead of a blank
    // card. One retry only, and never after HTTP has served the page.
    if (onHttpFallback() && !reverted && !httpLoaded) {
      reverted = true;
      keepTls(props.connection().url);
      forgetHttpFallback(props.connection().url);
      plainHttp.set(null);
      autoSwitched.set(false);
      errorMessage.set(null);
      return;
    }

    errorMessage.set(message);
  };

  /** True while the page is blocked by an untrusted certificate. */
  const certBlocked = () => {
    const message = errorMessage();
    return message !== null && isCertificateError(message);
  };

  const headers = () => {
    const connection = props.connection();
    return hasBasicAuth(connection)
      ? { Authorization: basicAuthHeader(connection.username, connection.password) }
      : null;
  };

  const dotClass = () =>
    loading() ? "bg-cyber animate-pulse" : live() ? "bg-primary" : "bg-muted-foreground/60";

  /** Reloads the page, re-sending Basic auth when the connection uses it. */
  const reload = () => {
    if (!web) return;
    const auth = headers();
    if (auth) web.load({ src: effectiveUrl(), headers: auth });
    else web.reload();
  };

  // A page needing HTTP Basic auth carries it as a request header, and only
  // `load({ src, headers })` sends headers, so such a page is loaded here once
  // and the `src` prop stays empty to avoid a second, unauthenticated request.
  effect(() => {
    const url = effectiveUrl();
    const enabled = canPreview();
    const auth = headers();
    if (web && enabled && auth) web.load({ src: url, headers: auth });
  });

  // "全部刷新" bumps the token; every tile that is previewing reloads.
  let seen = props.refreshToken();
  effect(() => {
    const token = props.refreshToken();
    if (token === seen) return;
    seen = token;
    if (canPreview()) reload();
  });

  return (
    <View class="overflow-hidden rounded-(--radius) border border-border bg-card">
      <View class="flex-row items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <StatusDot class={dotClass()} />
        <Text class="flex-1 text-sm font-semibold text-card-foreground" style={{ numberOfLines: 1 }}>
          {props.connection().name}
        </Text>
        <If when={props.isDefault()}>
          <View class="rounded-full bg-primary px-2 py-0.5">
            <Text class="text-xs font-medium text-primary-foreground">默认</Text>
          </View>
        </If>
        <If when={plainHttp() !== null}>
          <View class="rounded-full border border-cyber px-2 py-0.5">
            <Text class="text-xs font-medium text-cyber">{autoSwitched() ? "自动 HTTP" : "HTTP"}</Text>
          </View>
        </If>
      </View>

      <View class="relative" style={{ height: props.previewHeight() }}>
        <If
          when={canPreview()}
          else={<Placeholder reason={placeholderReason(props.connection(), props.previewEnabled())} onOpen={props.onOpen} />}
        >
          <View class="flex-1 bg-background">
            <If when={loading()}>
              <View class="absolute left-0 right-0 top-0 h-0.5 bg-cyber" />
            </If>
            <WebView
              ref={web}
              src={headers() ? undefined : effectiveUrl()}
              style={{ flex: 1 }}
              onLoadStart={() => {
                loading.set(true);
                live.set(false);
                errorMessage.set(null);
              }}
              onLoad={() => {
                loading.set(false);
                live.set(true);
                errorMessage.set(null);
                if (plainHttp() !== null) httpLoaded = true;
              }}
              onError={({ message }) => handleError(message)}
              desktop={{ allowsBackForwardNavigationGestures: true }}
              ios={{ allowsBackForwardNavigationGestures: true }}
            />
            <If when={certBlocked()}>
              <TlsHelp
                compact
                message={errorMessage() ?? ""}
                httpUrls={httpCandidates(props.connection().url)}
                onRetryHttp={(url) => {
                  tried = [...tried, url];
                  rememberHttpFallback(props.connection().url, url);
                  autoSwitched.set(false);
                  reverted = false;
                  errorMessage.set(null);
                  plainHttp.set(url);
                }}
                onOpenExternal={() => openExternal(effectiveUrl())}
                onDismiss={() => errorMessage.set(null)}
              />
            </If>
          </View>
        </If>
      </View>

      <View class="flex-row items-center gap-2 border-t border-border px-3 py-1.5">
        <StatusDot class={dotClass()} />
        <Text class="flex-1 text-xs text-muted-foreground font-mono" style={{ numberOfLines: 1 }}>
          {effectiveUrl()}
        </Text>
        <If when={plainHttp() !== null}>
          <Button onPress={useHttps} class="rounded-(--radius) px-2 py-0.5 active:opacity-70">
            <Text class="text-xs font-medium text-cyber">切回 HTTPS</Text>
          </Button>
        </If>
      </View>

      <View class="flex-row flex-wrap items-center gap-1.5 border-t border-border bg-secondary/20 px-2 py-2">
        <Button onPress={props.onOpen} class="rounded-(--radius) bg-primary px-2.5 py-1.5 active:opacity-90">
          <Text class="text-xs font-semibold text-primary-foreground">打开</Text>
        </Button>
        <GhostButton label="刷新" onPress={reload} />
        <GhostButton label="编辑" onPress={props.onEdit} />
        <If when={!props.isDefault()}>
          <GhostButton label="设为默认" onPress={props.onSetDefault} />
        </If>
        <View class="flex-1" />
        <DangerButton label="删除" onPress={props.onDelete} />
      </View>
    </View>
  );
}
