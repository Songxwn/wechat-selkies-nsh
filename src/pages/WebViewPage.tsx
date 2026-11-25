// The in-app web view page: loads a wechat-selkies page, with optional HTTP Basic auth.

import { effect, signal, Text, View, WebView, type WebViewRef } from "nsh";
import { Button, NavPage } from "nsh/base";
import { hasBasicAuth, type Connection } from "../models/connection";
import { nav } from "../nav";

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** The UTF-8 bytes of a string (the runtime may not provide `TextEncoder`). */
function utf8Bytes(input: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && index + 1 < input.length) {
      const next = input.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const point = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        bytes.push(
          0xf0 | (point >> 18),
          0x80 | ((point >> 12) & 0x3f),
          0x80 | ((point >> 6) & 0x3f),
          0x80 | (point & 0x3f),
        );
        index += 1;
        continue;
      }
      bytes.push(0xef, 0xbf, 0xbd); // unpaired surrogate: U+FFFD
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

/** Standard base64 of a string's UTF-8 bytes, without relying on `btoa`. */
function toBase64(input: string): string {
  const bytes = utf8Bytes(input);
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const has1 = index + 1 < bytes.length;
    const has2 = index + 2 < bytes.length;
    const b0 = bytes[index];
    const b1 = has1 ? bytes[index + 1] : 0;
    const b2 = has2 ? bytes[index + 2] : 0;
    output += BASE64_ALPHABET[b0 >> 2];
    output += BASE64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    output += has1 ? BASE64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : "=";
    output += has2 ? BASE64_ALPHABET[b2 & 0x3f] : "=";
  }
  return output;
}

export function WebViewPage(props: { connection: Connection }) {
  const connection = props.connection;
  const title = connection.name === "" ? "微信" : connection.name;
  const loading = signal(true);
  let web!: WebViewRef;

  // nsh's WebView sends custom request headers through `load({ src, headers })`
  // (the `src` prop takes no headers), so a Basic-auth page is loaded once here,
  // and `src` stays empty so the page is not requested twice.
  const headers = hasBasicAuth(connection)
    ? { Authorization: `Basic ${toBase64(`${connection.username.trim()}:${connection.password}`)}` }
    : null;
  if (headers) {
    effect(() => {
      if (web) web.load({ src: connection.url, headers });
    });
  }

  return (
    <NavPage
      class="flex-1"
      title={title}
      header={
        <View class="flex-row items-center gap-3 border-b border-border px-3 py-3">
          <Button onPress={() => nav.pop()} class="rounded-(--radius) px-2 py-1.5 active:opacity-60">
            <Text class="text-sm text-primary">返回</Text>
          </Button>
          <Text class="flex-1 text-base font-semibold text-foreground" style={{ numberOfLines: 1 }}>
            {title}
          </Text>
          <Button onPress={() => web?.reload()} class="rounded-(--radius) px-2 py-1.5 active:opacity-60">
            <Text class="text-sm text-primary">刷新</Text>
          </Button>
        </View>
      }
      headerRight={
        <Button onPress={() => web?.reload()} class="px-2 py-1.5 active:opacity-60">
          <Text class="text-sm text-primary">刷新</Text>
        </Button>
      }
    >
      <View class="flex-1 bg-background">
        <If when={loading()}>
          <View class="h-0.5 w-full bg-primary" />
        </If>
        <WebView
          ref={web}
          src={headers ? undefined : connection.url}
          style={{ flex: 1 }}
          onLoadStart={() => loading.set(true)}
          onLoad={() => loading.set(false)}
          onError={() => loading.set(false)}
          ios={{ allowsBackForwardNavigationGestures: true }}
          desktop={{ allowsBackForwardNavigationGestures: true }}
        />
      </View>
    </NavPage>
  );
}
