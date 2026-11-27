// The app's flows, mirroring test/widget_test.dart of the original Flutter app
// and covering the preview wall added in the console redesign. The console is a
// desktop app, so the tests open it as a desktop window.

import { expect, open, test } from "nsh/test";
import {
  connectionFromJson,
  connectionToJson,
  createConnection,
  hasBasicAuth,
} from "./src/models/connection";
import {
  certificateBypass,
  httpCandidates,
  isCertificateError,
  setCertificateBypass,
  toPlainHttp,
} from "./src/services/tls";
import { withBasicAuth, withoutCredentials } from "./src/services/http";

/** The window the console runs in: a wide desktop, so the wall shows 3 columns. */
const desktop = { platform: "windows", width: 1280, height: 800 } as const;

function twoConnections() {
  const first = createConnection({ name: "本地微信", url: "https://localhost:3001" });
  const second = createConnection({ name: "同事机器", url: "https://10.0.0.8:3001" });
  return {
    storage: {
      connections: JSON.stringify([connectionToJson(first), connectionToJson(second)]),
      defaultConnectionId: first.id,
    },
  };
}

test("首次启动创建默认连接并显示", async () => {
  const app = await open("./App.tsx", { ...desktop });
  await app.waitFor("本地微信");
  expect(app.shows("本地微信")).toBe(true);
  expect(app.shows("role:button[添加连接]")).toBe(true);
});

test("Connection 序列化往返", () => {
  const connection = createConnection({
    name: "t",
    url: "https://x:3001",
    username: "u",
    password: "p",
  });
  const restored = connectionFromJson(connectionToJson(connection));
  expect(restored.name).toBe("t");
  expect(restored.url).toBe("https://x:3001");
  expect(hasBasicAuth(restored)).toBe(true);
});

test("证书错误能被识别，并可切换到 HTTP 端口", () => {
  expect(isCertificateError("SSL peer certificate or SSH remote key was not OK")).toBe(true);
  expect(isCertificateError("net::ERR_CERT_AUTHORITY_INVALID")).toBe(true);
  expect(isCertificateError("Connection refused")).toBe(false);

  // wechat-selkies: HTTPS 3001 beside HTTP 3000 — the direct way past a
  // self-signed certificate is the HTTP port.
  expect(toPlainHttp("https://10.0.0.8:3001")).toBe("http://10.0.0.8:3000");
  expect(httpCandidates("https://localhost:3001/app?x=1")).toEqual([
    "http://localhost:3000/app?x=1",
    "http://localhost:3001/app?x=1",
  ]);
  // Any other port keeps it.
  expect(httpCandidates("https://example.com:8443")).toEqual(["http://example.com:8443"]);
  expect(toPlainHttp("http://10.0.0.8:3000")).toBe(null);
  expect(toPlainHttp("10.0.0.8:3001")).toBe(null);
});

test("Basic 认证写进 URL，整页及其子资源都带上", () => {
  // 主文档带 header 只能认证主文档；脚本与样式是带认证的同源子资源，所以
  // 凭据要放进 userinfo，浏览器会为本源的所有请求带上它。
  expect(withBasicAuth("https://10.0.0.8:3001", "u", "p")).toBe("https://u:p@10.0.0.8:3001");
  expect(withBasicAuth("https://10.0.0.8:3001/app?x=1", "u", "p")).toBe(
    "https://u:p@10.0.0.8:3001/app?x=1",
  );
  // `:` 与 `@` 会转义，这样 userinfo 的边界不会被凭据里的字符打乱。
  expect(withBasicAuth("https://h:3001/", "a@b", "p:w")).toBe(
    "https://a%40b:p%3Aw@h:3001/",
  );
  // 中文按 UTF-8 百分号编码。
  expect(withBasicAuth("https://h:3001/", "用户", "密码")).toBe(
    "https://%E7%94%A8%E6%88%B7:%E5%AF%86%E7%A0%81@h:3001/",
  );
  // 存储里旧的 userinfo 被替换，而不是叠加。
  expect(withBasicAuth("https://old:secret@h:3001/", "u", "p")).toBe("https://u:p@h:3001/");
  // 没有配置凭据时原样返回：直接粘进地址里的账号密码继续有效。
  expect(withBasicAuth("https://h:3001/", "", "")).toBe("https://h:3001/");
  expect(withBasicAuth("https://old:secret@h:3001/", "", "")).toBe("https://old:secret@h:3001/");
  // 不是浏览器地址就原样返回。
  expect(withBasicAuth("localhost:3001", "u", "p")).toBe("localhost:3001");
});

test("界面上的地址不显示密码", () => {
  expect(withoutCredentials("https://u:p@h:3001/app")).toBe("https://h:3001/app");
  expect(withoutCredentials("https://h:3001/app")).toBe("https://h:3001/app");
  expect(withoutCredentials("https://h:3001?next=/a")).toBe("https://h:3001?next=/a");
});

test("证书绕过状态由原生模块决定", () => {
  // App.tsx sets this from tls-native at startup; the flag only decides what the
  // certificate panel says, the bypass itself lives in the native module.
  setCertificateBypass(false);
  expect(certificateBypass()).toBe(false);
  setCertificateBypass(true);
  expect(certificateBypass()).toBe(true);
  setCertificateBypass(false);
});

test("添加连接并写入存储", async () => {
  const app = await open("./App.tsx", { ...desktop });
  await app.waitFor("本地微信");
  await app.press("role:button[添加连接]");
  await app.waitFor("id:field-name");
  await app.type("id:field-name", "公司服务器");
  await app.clear("id:field-url");
  await app.type("id:field-url", "192.168.1.10:3001");
  await app.press("role:button[保存]");
  await app.waitFor("公司服务器");
  await app.waitUntil(() => String(app.storage().connections).includes("https://192.168.1.10:3001"));
  expect(String(app.storage().connections)).toContain("https://192.168.1.10:3001");
});

test("预览墙同时展示多个连接", async () => {
  const { storage } = twoConnections();
  const app = await open("./App.tsx", { ...desktop, storage });
  await app.waitFor("本地微信");
  expect(app.shows("同事机器")).toBe(true);
  expect(app.shows("role:button[列表]")).toBe(true);
  expect(app.shows("role:button[全部刷新]")).toBe(true);
});

test("可切换到列表模式", async () => {
  const { storage } = twoConnections();
  const app = await open("./App.tsx", { ...desktop, storage });
  await app.waitFor("本地微信");
  await app.press("role:button[列表]");
  await app.waitFor("同事机器");
  expect(app.shows("本地微信")).toBe(true);
  expect(app.shows("同事机器")).toBe(true);
});

test("搜索过滤连接", async () => {
  const { storage } = twoConnections();
  const app = await open("./App.tsx", { ...desktop, storage });
  await app.waitFor("本地微信");
  await app.type("id:search", "同事");
  await app.waitFor("本地微信", { state: "gone" });
  expect(app.shows("同事机器")).toBe(true);
});

test("可切换深色 / 浅色主题", async () => {
  const app = await open("./App.tsx", { ...desktop });
  await app.waitFor("本地微信");
  expect(app.shows("role:button[浅色]")).toBe(true);
  await app.press("role:button[浅色]");
  await app.waitFor("role:button[深色]");
  expect(app.shows("role:button[深色]")).toBe(true);
});

test("删除连接需要确认", async () => {
  const connection = createConnection({ name: "临时连接", url: "https://example.com:3001" });
  const app = await open("./App.tsx", {
    ...desktop,
    storage: {
      connections: JSON.stringify([connectionToJson(connection)]),
      defaultConnectionId: connection.id,
    },
  });
  await app.waitFor("临时连接");
  app.onDialog((dialog) => {
    expect(dialog.title).toBe("删除连接");
    return "删除";
  });
  await app.press("role:button[删除]");
  await app.waitFor("临时连接", { state: "gone" });
});

test("外部打开连接会调用系统浏览器", async () => {
  const connection = createConnection({
    name: "外部连接",
    url: "https://example.com:3001",
    openExternal: true,
  });
  const app = await open("./App.tsx", {
    ...desktop,
    storage: {
      connections: JSON.stringify([connectionToJson(connection)]),
      defaultConnectionId: connection.id,
    },
  });
  await app.waitFor("外部连接");
  await app.press("role:button[打开]");
  await app.waitUntil(() => app.openedUrls().includes("https://example.com:3001"));
  expect(app.openedUrls()).toContain("https://example.com:3001");
});
