// The app's flows, mirroring test/widget_test.dart of the original Flutter app.

import { expect, open, test } from "nsh/test";
import {
  connectionFromJson,
  connectionToJson,
  createConnection,
  hasBasicAuth,
} from "./src/models/connection";

test("首次启动创建默认连接并显示", async () => {
  const app = await open("./App.tsx");
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

test("添加连接并写入存储", async () => {
  const app = await open("./App.tsx");
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

test("删除连接需要确认", async () => {
  const connection = createConnection({ name: "临时连接", url: "https://example.com:3001" });
  const app = await open("./App.tsx", {
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
    storage: {
      connections: JSON.stringify([connectionToJson(connection)]),
      defaultConnectionId: connection.id,
    },
  });
  await app.waitFor("外部连接");
  await app.press("role:button[连接]");
  await app.waitUntil(() => app.openedUrls().includes("https://example.com:3001"));
  expect(app.openedUrls()).toContain("https://example.com:3001");
});
