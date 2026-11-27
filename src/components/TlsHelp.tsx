// Shown over a web view whose page failed because its certificate is not
// trusted. Windows normally never gets here: ext/tls-native makes WebView2
// accept untrusted certificates. Elsewhere (macOS, Linux) the platform web view
// has no such switch, so the panel offers the fixes that do work: the service's
// plain-HTTP port, the system browser, or a certificate in the trust store.

import { Text, View } from "nsh";
import { Button } from "nsh/base";
import { certificateBypass } from "../services/tls";
import { GhostButton } from "../ui/kit";

/** A short label for an HTTP candidate: ":3000", or "HTTP" without a port. */
function portLabel(url: string): string {
  const match = /^http:\/\/[^/?#]+:(\d+)/i.exec(url);
  return match === null ? "HTTP" : `:${match[1]}`;
}

export function TlsHelp(props: {
  message: string;
  /** Plain-HTTP addresses to try, best first; empty when there is none. */
  httpUrls: string[];
  onRetryHttp: (url: string) => void;
  onOpenExternal: () => void;
  onDismiss: () => void;
  /** Compact layout for the small preview cards. */
  compact?: boolean;
}) {
  const primary = () => (props.httpUrls.length > 0 ? props.httpUrls[0] : null);

  return (
    <View
      class="items-start gap-2 bg-card/95 p-3"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <View class="flex-row items-center gap-2">
        <View class="size-2 shrink-0 rounded-full bg-destructive" />
        <Text class="text-sm font-semibold text-foreground">证书不受信任</Text>
      </View>

      <Text class="text-xs text-muted-foreground" style={{ numberOfLines: props.compact ? 2 : 4 }}>
        {props.message}
      </Text>

      <If when={!props.compact}>
        <Text class="text-xs text-muted-foreground">
          {certificateBypass()
            ? "已开启忽略证书错误，这次仍被拒绝（重启应用后再试）。也可直接改用下面的明文 HTTP 地址："
            : "当前平台无法在应用内忽略证书错误（Windows 支持）。可直接改用该服务的明文 HTTP 端口，不需要任何证书："}
        </Text>
      </If>

      <If when={primary() !== null}>
        <Text class="text-xs text-primary font-mono" style={{ numberOfLines: 1 }}>
          {primary() ?? ""}
        </Text>
      </If>

      <View class="flex-row flex-wrap items-center gap-1.5">
        <If when={props.httpUrls.length > 0}>
          <Button
            onPress={() => props.onRetryHttp(props.httpUrls[0] ?? "")}
            class="rounded-(--radius) bg-primary px-2.5 py-1.5 active:opacity-90"
          >
            <Text class="text-xs font-semibold text-primary-foreground">
              {`改用 HTTP ${portLabel(props.httpUrls[0] ?? "")}`}
            </Text>
          </Button>
        </If>
        <If when={props.httpUrls.length > 1}>
          <Button
            onPress={() => props.onRetryHttp(props.httpUrls[1] ?? "")}
            class="rounded-(--radius) border border-border bg-secondary px-2.5 py-1.5 active:opacity-80"
          >
            <Text class="text-xs font-medium text-secondary-foreground">
              {`改用 HTTP ${portLabel(props.httpUrls[1] ?? "")}`}
            </Text>
          </Button>
        </If>
        <Button
          onPress={props.onOpenExternal}
          class="rounded-(--radius) border border-border bg-secondary px-2.5 py-1.5 active:opacity-80"
        >
          <Text class="text-xs font-medium text-secondary-foreground">浏览器打开</Text>
        </Button>
        <GhostButton label="关闭" onPress={props.onDismiss} />
      </View>

      <If when={!props.compact}>
        <Text class="text-xs text-muted-foreground/70">
          要保留 HTTPS：把自签名证书导入系统受信任根证书，或用 mkcert 签发。
        </Text>
      </If>
    </View>
  );
}