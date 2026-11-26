// The add / edit connection dialog. Returns the saved connection, or nothing on cancel.

import { signal, Text, View, type JSX } from "nsh";
import { Button, Input, Switch } from "nsh/base";
import { createConnection, kDefaultUrl, type Connection } from "../models/connection";
import { normalizeUrl, supportsInAppWebView } from "../services/platform";

function Field(props: { label: string; hint?: string; children?: JSX.Element }) {
  return (
    <View class="gap-1">
      <Text class="text-xs text-muted-foreground">{props.label}</Text>
      {props.children}
      <If when={props.hint}>{(hint) => <Text class="text-xs text-muted-foreground/70">{hint()}</Text>}</If>
    </View>
  );
}

export function ConnectionForm(props: {
  existing: Connection | null;
  onSave: (connection: Connection) => void;
  onCancel: () => void;
}) {
  const existing = props.existing;
  // The saved connection carries the id; a new one gets a fresh one. The fields
  // start empty for a new connection, as the original form did.
  const base = existing ?? createConnection();
  const name = signal(existing?.name ?? "");
  const url = signal(existing?.url ?? kDefaultUrl);
  const username = signal(existing?.username ?? "");
  const password = signal(existing?.password ?? "");
  const ignoreSsl = signal(existing?.ignoreSsl ?? true);
  const openExternal = signal(existing?.openExternal ?? false);
  const masked = signal(true);
  const error = signal<string | null>(null);

  const submit = () => {
    if (url().trim() === "") {
      error.set("请输入服务地址");
      return;
    }
    const normalized = normalizeUrl(url());
    props.onSave({
      ...base,
      name: name().trim() === "" ? "未命名" : name().trim(),
      url: normalized === "" ? kDefaultUrl : normalized,
      username: username().trim(),
      password: password(),
      ignoreSsl: ignoreSsl(),
      openExternal: openExternal(),
    });
  };

  return (
    <View class="gap-3">
      <Text class="text-lg font-semibold text-card-foreground">
        {props.existing ? "编辑连接" : "添加连接"}
      </Text>

      <Field label="名称" hint="例如：本地微信、公司服务器">
        <Input
          testID="field-name"
          value={name()}
          onChange={({ value }) => name.set(value)}
          placeholder="例如：本地微信、公司服务器"
          returnKeyType="next"
          class="rounded-(--radius) border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
        />
      </Field>

      <Field label="服务地址" hint="本地一般为 https://localhost:3001，远程填写服务器地址">
        <Input
          testID="field-url"
          value={url()}
          onChange={({ value }) => url.set(value)}
          placeholder="https://localhost:3001"
          keyboardType="url"
          autoCorrect={false}
          class="rounded-(--radius) border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
        />
      </Field>

      <Field label="登录用户名（可选）" hint="未填写则不进行账号密码认证">
        <Input
          testID="field-username"
          value={username()}
          onChange={({ value }) => username.set(value)}
          placeholder="未填写则不进行账号密码认证"
          autoCorrect={false}
          class="rounded-(--radius) border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
        />
      </Field>

      <Field label="登录密码（可选）">
        <View class="flex-row items-center gap-2">
          <Input
            testID="field-password"
            value={password()}
            onChange={({ value }) => password.set(value)}
            placeholder="与用户名同时填写时生效"
            masked={masked()}
            class="flex-1 rounded-(--radius) border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
          />
          <Button onPress={() => masked.set(!masked())} class="px-2 py-2 active:opacity-60">
            <Text class="text-sm text-primary">{masked() ? "显示" : "隐藏"}</Text>
          </Button>
        </View>
      </Field>

      <View class="flex-row items-center justify-between gap-3 py-1">
        <View class="flex-1">
          <Text class="text-sm text-foreground">忽略 SSL 证书错误</Text>
          <Text class="text-xs text-muted-foreground">
            nsh 未提供证书回调，此项不生效；自签名证书会被拒绝，可改用 HTTP 或导入系统受信任证书
          </Text>
        </View>
        <Switch
          checked={ignoreSsl()}
          onChange={({ checked }) => ignoreSsl.set(checked)}
          trackClass="w-11 rounded-full bg-muted p-0.5 transition-colors checked:bg-primary"
          thumbClass="size-5 rounded-full bg-background shadow-sm transition-transform checked:translate-x-5"
        />
      </View>

      <View class="flex-row items-center justify-between gap-3 py-1">
        <View class="flex-1">
          <Text class="text-sm text-foreground">使用系统默认浏览器打开</Text>
          <If when={!supportsInAppWebView()}>
            <Text class="text-xs text-muted-foreground">当前平台不支持应用内浏览，将始终使用系统浏览器</Text>
          </If>
        </View>
        <Switch
          checked={openExternal() || !supportsInAppWebView()}
          disabled={!supportsInAppWebView()}
          onChange={({ checked }) => openExternal.set(checked)}
          trackClass="w-11 rounded-full bg-muted p-0.5 transition-colors checked:bg-primary disabled:opacity-50"
          thumbClass="size-5 rounded-full bg-background shadow-sm transition-transform checked:translate-x-5"
        />
      </View>

      <If when={error()}>
        <Text class="text-sm text-destructive">{error()}</Text>
      </If>

      <View class="flex-row justify-end gap-2 pt-1">
        <Button onPress={props.onCancel} class="rounded-(--radius) px-3 py-2 active:opacity-70">
          <Text class="text-sm font-medium text-muted-foreground">取消</Text>
        </Button>
        <Button onPress={submit} class="rounded-(--radius) bg-primary px-4 py-2 active:opacity-70">
          <Text class="text-sm font-medium text-primary-foreground">保存</Text>
        </Button>
      </View>
    </View>
  );
}
