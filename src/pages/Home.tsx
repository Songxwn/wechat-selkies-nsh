// The home screen: the saved connections, the tips, and the add/delete flows.

import { batch, Scroll, signal, Text, View } from "nsh";
import { AlertDialog, Dialog, NavPage } from "nsh/base";
import type { Connection } from "../models/connection";
import { nav } from "../nav";
import {
  allConnections,
  isEmpty,
  isDefaultConnection,
  removeConnection,
  saveConnection,
  setDefaultConnection,
} from "../store/connections";
import {
  APP_VERSION,
  DEPLOY_URL,
  openExternal,
  PROJECT_URL,
  supportsInAppWebView,
} from "../services/platform";
import { Bullet, Card, DangerButton, PrimaryButton, SecondaryButton } from "../ui/kit";
import { ConnectionForm } from "./ConnectionForm";

function ConnectionRow(props: {
  connection: () => Connection;
  isDefault: () => boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <View class="gap-2 border-b border-border py-3">
      <View class="flex-row items-center gap-2">
        <Text class="flex-1 text-base font-medium text-foreground" style={{ numberOfLines: 1 }}>
          {props.connection().name}
        </Text>
        <If when={props.isDefault()}>
          <View class="rounded-sm bg-primary px-1.5 py-0.5">
            <Text class="text-xs text-primary-foreground">默认</Text>
          </View>
        </If>
      </View>
      <Text class="text-xs text-muted-foreground font-mono" style={{ numberOfLines: 1 }}>
        {props.connection().url}
      </Text>
      <View class="flex-row flex-wrap gap-2 pt-1">
        <PrimaryButton label="连接" onPress={props.onOpen} />
        <SecondaryButton label="编辑" onPress={props.onEdit} />
        <If when={!props.isDefault()}>
          <SecondaryButton label="设为默认" onPress={props.onSetDefault} />
        </If>
        <DangerButton label="删除" onPress={props.onDelete} />
      </View>
    </View>
  );
}

function TipsCard() {
  return (
    <Card>
      <Text class="text-base font-medium text-card-foreground">使用说明</Text>
      <Bullet>
        请先在 Linux / Docker 中部署 wechat-selkies（
        <Text onPress={() => openExternal(DEPLOY_URL)} class="text-[13px] text-primary">
          部署说明
        </Text>
        ），并确保端口 3001 可访问。
      </Bullet>
      <Bullet>
        若通过 WSL2 或远程 Linux 运行，请将 localhost 改为对应 IP（如 https://192.168.x.x:3001）。
      </Bullet>
      <Bullet>
        剪贴板共享：本机复制的文字、图片可与 Docker 内微信共享，在网页版微信中可直接粘贴发送。
      </Bullet>
      <Bullet>文件拖入 / 上传：将文件拖入或选择上传，可发送到 Docker 内微信聊天。</Bullet>
    </Card>
  );
}

function Footer() {
  return (
    <View class="flex-row flex-wrap items-center justify-center gap-2 pt-2">
      <Text class="text-xs text-muted-foreground">{`v${APP_VERSION}`}</Text>
      <Text onPress={() => openExternal(DEPLOY_URL)} class="text-[13px] text-primary">
        部署说明
      </Text>
      <Text class="text-muted-foreground">·</Text>
      <Text onPress={() => openExternal(PROJECT_URL)} class="text-[13px] text-primary">
        wechat-selkies 项目
      </Text>
    </View>
  );
}

export function Home() {
  const formOpen = signal(false);
  const editing = signal<Connection | null>(null);
  const notice = signal<string | null>(null);

  const openForm = (existing: Connection | null) => {
    batch(() => {
      editing.set(existing);
      formOpen.set(true);
    });
  };

  const openConnection = async (connection: Connection) => {
    if (connection.openExternal || !supportsInAppWebView()) {
      const opened = await openExternal(connection.url);
      if (!opened) notice.set(`无法打开链接：${connection.url}`);
      return;
    }
    nav.push({ name: "webview", connection });
  };

  const confirmDelete = async (connection: Connection) => {
    const { action } = await AlertDialog.show({
      title: "删除连接",
      description: `确定要删除「${connection.name}」吗？`,
      actions: [
        { id: "cancel", label: "取消", role: "cancel" },
        { id: "delete", label: "删除", role: "destructive" },
      ],
    });
    if (action === "delete") await removeConnection(connection.id);
  };

  const onSave = async (connection: Connection) => {
    formOpen.set(false);
    await saveConnection(connection);
  };

  return (
    <NavPage
      class="flex-1"
      title="WeChat Selkies"
      header={
        <View class="flex-row items-center border-b border-border px-4 py-3">
          <Text class="text-lg font-semibold text-foreground">WeChat Selkies</Text>
        </View>
      }
    >
      <Scroll class="flex-1">
        <View class="items-center px-4 py-4">
          <View class="w-full max-w-[640px] gap-4">
            <Text class="text-sm text-muted-foreground">管理连接并打开 wechat-selkies 网页版微信</Text>

            <View class="flex-row">
              <PrimaryButton label="添加连接" onPress={() => openForm(null)} />
            </View>

            <If when={notice()}>
              <View class="rounded-(--radius) border border-destructive bg-card px-3 py-2">
                <Text class="text-sm text-destructive">{notice()}</Text>
              </View>
            </If>

            <Card>
              <Text class="text-base font-medium text-card-foreground">已保存的连接</Text>
              <If
                when={isEmpty()}
                else={
                  <View>
                    <Each of={allConnections()} key={(connection: Connection) => connection.id}>
                      {(connection) => (
                        <ConnectionRow
                          connection={connection}
                          isDefault={() => isDefaultConnection(connection())}
                          onOpen={() => openConnection(connection())}
                          onEdit={() => openForm(connection())}
                          onSetDefault={() => setDefaultConnection(connection().id)}
                          onDelete={() => confirmDelete(connection())}
                        />
                      )}
                    </Each>
                  </View>
                }
              >
                <Text class="py-4 text-sm text-muted-foreground">暂无连接，点击「添加连接」保存一个。</Text>
              </If>
            </Card>

            <TipsCard />
            <Footer />
          </View>
        </View>
      </Scroll>

      <Dialog
        open={formOpen()}
        animation="fade"
        onOpenChange={({ open }) => formOpen.set(open)}
        backdropClass="bg-black/40"
        class="m-auto w-full max-w-[420px] rounded-2xl border border-border bg-card p-5"
      >
        <If when={formOpen()}>
          <ConnectionForm existing={editing()} onSave={onSave} onCancel={() => formOpen.set(false)} />
        </If>
      </Dialog>
    </NavPage>
  );
}
