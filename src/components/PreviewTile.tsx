// One card of the preview wall: a live, in-app web view for a single
// connection, plus its name, status and actions. Several tiles render at once,
// so the user can watch multiple WeChat instances side by side.

import { effect, signal, Text, View, WebView, type WebViewRef } from "nsh";
import { Button } from "nsh/base";
import { hasBasicAuth, type Connection } from "../models/connection";
import { basicAuthHeader } from "../services/http";
import { supportsInAppWebView } from "../services/platform";
import { DangerButton, GhostButton, StatusDot } from "../ui/kit";

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
  let web: WebViewRef | undefined;

  const canPreview = () =>
    props.previewEnabled() && supportsInAppWebView() && !props.connection().openExternal;

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
    if (auth) web.load({ src: props.connection().url, headers: auth });
    else web.reload();
  };

  // A page needing HTTP Basic auth carries it as a request header, and only
  // `load({ src, headers })` sends headers, so such a page is loaded here once
  // and the `src` prop stays empty to avoid a second, unauthenticated request.
  effect(() => {
    const connection = props.connection();
    const enabled = canPreview();
    const auth = headers();
    if (web && enabled && auth) web.load({ src: connection.url, headers: auth });
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
              src={headers() ? undefined : props.connection().url}
              style={{ flex: 1 }}
              onLoadStart={() => {
                loading.set(true);
                live.set(false);
              }}
              onLoad={() => {
                loading.set(false);
                live.set(true);
              }}
              onError={() => {
                loading.set(false);
                live.set(false);
              }}
              desktop={{ allowsBackForwardNavigationGestures: true }}
              ios={{ allowsBackForwardNavigationGestures: true }}
            />
          </View>
        </If>
      </View>

      <View class="flex-row items-center gap-2 border-t border-border px-3 py-1.5">
        <StatusDot class={dotClass()} />
        <Text class="flex-1 text-xs text-muted-foreground font-mono" style={{ numberOfLines: 1 }}>
          {props.connection().url}
        </Text>
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
