// The console: a preview wall of live web views (one per connection), a compact
// list mode, search, a light/dark switch and the add/edit/delete flows.

import {
  batch,
  colorScheme,
  Image,
  Scroll,
  setColorScheme,
  signal,
  Text,
  View,
  windowSize,
} from "nsh";
import { AlertDialog, Button, Dialog, Input, NavPage } from "nsh/base";
import { PreviewTile } from "../components/PreviewTile";
import type { Connection } from "../models/connection";
import { nav } from "../nav";
import appIcon from "../../icon.png";
import {
  allConnections,
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
import { Bullet, Chip, DangerButton, GhostButton, Panel, PrimaryButton, SectionLabel } from "../ui/kit";
import { ConnectionForm } from "./ConnectionForm";

function Segment(props: { label: string; active: () => boolean; onPress: () => void }) {
  return (
    <Button
      onPress={props.onPress}
      class={`rounded-(--radius) px-3 py-1.5 transition active:opacity-80 ${props.active() ? "bg-primary" : ""}`}
    >
      <Text class={`text-xs font-medium ${props.active() ? "text-primary-foreground" : "text-muted-foreground"}`}>
        {props.label}
      </Text>
    </Button>
  );
}

function ListRow(props: {
  connection: () => Connection;
  isDefault: () => boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <View class="flex-row flex-wrap items-center gap-2 rounded-(--radius) border border-border bg-card px-3 py-2">
      <View class="size-2 shrink-0 rounded-full bg-primary" />
      <View class="min-w-[160px] flex-1">
        <View class="flex-row items-center gap-2">
          <Text class="text-sm font-semibold text-card-foreground" style={{ numberOfLines: 1 }}>
            {props.connection().name}
          </Text>
          <If when={props.isDefault()}>
            <View class="rounded-full bg-primary px-2 py-0.5">
              <Text class="text-xs font-medium text-primary-foreground">默认</Text>
            </View>
          </If>
        </View>
        <Text class="text-xs text-muted-foreground font-mono" style={{ numberOfLines: 1 }}>
          {props.connection().url}
        </Text>
      </View>
      <Button onPress={props.onOpen} class="rounded-(--radius) bg-primary px-2.5 py-1.5 active:opacity-90">
        <Text class="text-xs font-semibold text-primary-foreground">打开</Text>
      </Button>
      <GhostButton label="编辑" onPress={props.onEdit} />
      <If when={!props.isDefault()}>
        <GhostButton label="设为默认" onPress={props.onSetDefault} />
      </If>
      <DangerButton label="删除" onPress={props.onDelete} />
    </View>
  );
}

function Footer() {
  return (
    <View class="flex-row flex-wrap items-center justify-center gap-2 pt-2">
      <Text class="text-xs text-muted-foreground font-mono">{`v${APP_VERSION}`}</Text>
      <Text onPress={() => openExternal(DEPLOY_URL)} class="text-xs text-primary">
        部署说明
      </Text>
      <Text class="text-muted-foreground">·</Text>
      <Text onPress={() => openExternal(PROJECT_URL)} class="text-xs text-primary">
        wechat-selkies 项目
      </Text>
    </View>
  );
}

export function Home() {
  const formOpen = signal(false);
  const editing = signal<Connection | null>(null);
  const notice = signal<string | null>(null);
  const mode = signal<"wall" | "list">("wall");
  const query = signal("");
  const previewEnabled = signal(true);
  const refreshToken = signal(0);
  const showTips = signal(false);

  const dark = () => colorScheme() === "dark";
  const toggleTheme = () => setColorScheme(dark() ? "light" : "dark");

  const filtered = () => {
    const list = allConnections();
    const text = query().trim().toLowerCase();
    if (text === "") return list;
    return list.filter(
      (connection) =>
        connection.name.toLowerCase().includes(text) || connection.url.toLowerCase().includes(text),
    );
  };

  const columns = () => {
    const width = windowSize().width;
    if (width >= 1180) return 3;
    if (width >= 780) return 2;
    return 1;
  };

  const previewHeight = () => (columns() >= 3 ? 180 : columns() === 2 ? 210 : 300);

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

  const renderHeader = () => (
    <View class="flex-row flex-wrap items-center gap-3 border-b border-border bg-card/60 px-4 py-3">
      <Image src={appIcon} style={{ width: 36, height: 36, borderRadius: 10 }} />
      <View class="min-w-[140px] flex-1">
        <Text class="text-sm font-semibold tracking-wide text-foreground font-mono">WECHAT SELKIES</Text>
        <Text class="text-xs text-muted-foreground">局域网远程客户端 · 控制台</Text>
      </View>
      <Chip label={`v${APP_VERSION}`} textClass="text-muted-foreground font-mono" />
    </View>
  );

  return (
    <NavPage
      class="flex-1"
      title="WeChat Selkies"
      header={renderHeader()}
    >
      <View class="relative flex-1 bg-background">
        <View class="pointer-events-none absolute left-0 right-0 top-0 h-40 bg-linear-to-b from-primary/10 via-cyber/5 to-transparent" />

        <View class="flex-row flex-wrap items-center gap-2 px-4 py-3">
          <View class="flex-row rounded-(--radius) border border-border bg-secondary p-0.5">
            <Segment label="预览墙" active={() => mode() === "wall"} onPress={() => mode.set("wall")} />
            <Segment label="列表" active={() => mode() === "list"} onPress={() => mode.set("list")} />
          </View>
          <Input
            testID="search"
            value={query()}
            onChange={({ value }) => query.set(value)}
            placeholder="搜索连接…"
            autoCorrect={false}
            class="min-w-[160px] flex-1 rounded-(--radius) border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <If when={mode() === "wall"}>
            <View class="flex-row items-center gap-2">
              <GhostButton
                label={previewEnabled() ? "预览 开" : "预览 关"}
                onPress={() => previewEnabled.set(!previewEnabled())}
              />
              <GhostButton label="全部刷新" onPress={() => refreshToken.set(refreshToken() + 1)} />
            </View>
          </If>
          <Chip label={`${allConnections().length} 连接`} textClass="text-muted-foreground font-mono" />
          <GhostButton label={dark() ? "浅色" : "深色"} onPress={toggleTheme} />
          <PrimaryButton label="添加连接" onPress={() => openForm(null)} />
        </View>

        <Scroll class="flex-1">
          <View class="w-full gap-4 px-4 pb-6">
            <If when={notice()}>
              <View class="rounded-(--radius) border border-destructive bg-destructive/10 px-3 py-2">
                <Text class="text-sm text-destructive">{notice()}</Text>
              </View>
            </If>

            <If when={allConnections().length === 0}>
              <Panel class="items-center py-10">
                <Image src={appIcon} style={{ width: 72, height: 72, borderRadius: 18 }} />
                <Text class="text-sm text-muted-foreground">还没有连接</Text>
                <PrimaryButton label="添加第一个连接" onPress={() => openForm(null)} />
              </Panel>
            </If>

            <If when={allConnections().length > 0 && filtered().length === 0}>
              <Panel class="items-center py-8">
                <Text class="text-sm text-muted-foreground">没有匹配「{query()}」的连接</Text>
              </Panel>
            </If>

            <If when={mode() === "wall"}>
              <View
                class="w-full"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns()}, minmax(0, 1fr))`,
                  gap: 16,
                }}
              >
                <Each of={filtered()} key={(connection: Connection) => connection.id}>
                  {(connection) => (
                    <PreviewTile
                      connection={connection}
                      isDefault={() => isDefaultConnection(connection())}
                      refreshToken={refreshToken}
                      previewEnabled={previewEnabled}
                      previewHeight={previewHeight}
                      onOpen={() => openConnection(connection())}
                      onEdit={() => openForm(connection())}
                      onSetDefault={() => setDefaultConnection(connection().id)}
                      onDelete={() => confirmDelete(connection())}
                    />
                  )}
                </Each>
              </View>
            </If>

            <If when={mode() === "list"}>
              <View class="gap-2">
                <Each of={filtered()} key={(connection: Connection) => connection.id}>
                  {(connection) => (
                    <ListRow
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
            </If>

            <View class="rounded-(--radius) border border-border bg-card">
              <View class="flex-row items-center gap-2 px-4 py-3">
                <View class="flex-1">
                  <SectionLabel>使用说明</SectionLabel>
                </View>
                <GhostButton
                  label={showTips() ? "收起" : "展开"}
                  onPress={() => showTips.set(!showTips())}
                />
              </View>
              <If when={showTips()}>
                <View class="gap-2 px-4 pb-4">
                  <Bullet>
                    请先在 Linux / Docker 中部署 wechat-selkies（
                    <Text onPress={() => openExternal(DEPLOY_URL)} class="text-[13px] text-primary">
                      部署说明
                    </Text>
                    ），并确保端口 3001 可访问。
                  </Bullet>
                  <Bullet>若通过 WSL2 或远程 Linux 运行，请将 localhost 改为对应 IP（如 https://192.168.x.x:3001）。</Bullet>
                  <Bullet>
                    HTTPS 证书不受信任时页面会被拒绝：可点卡片上的「用 HTTP 重试」、用系统浏览器打开，或把服务的自签名证书导入系统受信任根证书（nsh 没有「忽略证书错误」开关）。
                  </Bullet>
                  <Bullet>剪贴板共享：本机复制的文字、图片可与 Docker 内微信共享，在网页版微信中可直接粘贴发送。</Bullet>
                  <Bullet>文件拖入 / 上传：将文件拖入或选择上传，可发送到 Docker 内微信聊天。</Bullet>
                </View>
              </If>
            </View>

            <Footer />
          </View>
        </Scroll>
      </View>

      <Dialog
        open={formOpen()}
        animation="fade"
        onOpenChange={({ open }) => formOpen.set(open)}
        backdropClass="bg-black/60"
        class="m-auto w-full max-w-[440px] rounded-(--radius) border border-border bg-card p-5"
      >
        <If when={formOpen()}>
          <ConnectionForm existing={editing()} onSave={onSave} onCancel={() => formOpen.set(false)} />
        </If>
      </Dialog>
    </NavPage>
  );
}
