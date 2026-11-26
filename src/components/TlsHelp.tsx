// Shown over a web view whose page failed because its certificate is not
// trusted: says what happened and offers the three fixes that actually work in
// a pure-TSX nsh app (plain HTTP, the system browser, trusting the cert).

import { Text, View } from "nsh";
import { Button } from "nsh/base";
import { GhostButton } from "../ui/kit";

export function TlsHelp(props: {
  message: string;
  /** null when the address is already plain HTTP. */
  httpUrl: string | null;
  onRetryHttp: () => void;
  onOpenExternal: () => void;
  onDismiss: () => void;
  /** Compact layout for the small preview cards. */
  compact?: boolean;
}) {
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
          自签名证书会被系统拒绝。nsh 的 WebView 没有忽略证书错误的开关，请选择下面的方式：
        </Text>
      </If>

      <View class="flex-row flex-wrap items-center gap-1.5">
        <If when={props.httpUrl !== null}>
          <Button
            onPress={props.onRetryHttp}
            class="rounded-(--radius) bg-primary px-2.5 py-1.5 active:opacity-90"
          >
            <Text class="text-xs font-semibold text-primary-foreground">用 HTTP 重试</Text>
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
          永久解决：把服务的自签名证书导入系统「受信任的根证书」，或用 mkcert 签发证书；也可在服务端改用 HTTP。
        </Text>
      </If>
    </View>
  );
}