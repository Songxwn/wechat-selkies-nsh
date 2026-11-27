# WeChat Selkies · nsh 控制台

<img src="icon.png" width="88" align="right" alt="应用图标" />

使用 [**Native Shell (nsh)**](https://github.com/longbridge/nsh) 以 **纯 TSX** 重写的
[Docker-Wechat-Localclient](https://github.com/Songxwn/Docker-Wechat-Localclient)（原项目基于 Flutter）。

在科技感控制台里管理多个 wechat-selkies 连接：**预览墙**可同时打开多个微信的实时画面，
点击即可进入单窗口全屏查看，也可交给系统浏览器打开。

> 上游项目：[nickrunning/wechat-selkies](https://github.com/nickrunning/wechat-selkies)
> 部署说明：[songxwn.com/cloud-wechat](https://songxwn.com/cloud-wechat/)

## 功能

- **多连接实时预览墙**：每个连接一张卡片，内嵌原生 WebView 实时显示网页版微信，多个连接可同时观看；
  自适应 1 / 2 / 3 列布局，支持「全部刷新」与一键开关预览。
- **单窗口全屏查看**：点击「打开」进入独立的 WebView 页面（返回 / 刷新，支持手势前进后退）。
- **列表模式**：紧凑列表视图，适合连接较多时快速切换。
- **搜索过滤**：按名称或地址即时筛选连接。
- **多连接管理**：新增 / 编辑 / 删除连接，设置默认连接，全部持久化到本地存储。
- **外部浏览器打开**：每个连接可切换为在系统浏览器中打开；平台不支持应用内 WebView（如 Linux 桌面）时自动回退。
- **HTTP Basic 认证**：可选用户名 / 密码，作为 `Authorization: Basic …` 请求头注入。
- **地址规范化**：未填写协议时自动补全 `https://`。
- **深色 / 浅色主题**：默认深色「控制台」外观（霓虹青绿 + 网格光晕），可一键切换。
- **版本 5.0.3**：证书错误自动绕过（自动降级 HTTP :3000 并记忆）。

## 界面

```
┌──────────────────────────────────────────────────────────┐
│ ◼ WECHAT SELKIES                    控制台        v5.0.3  │
├──────────────────────────────────────────────────────────┤
│ [预览墙|列表] 搜索连接…  预览 开 全部刷新 2 连接 浅色 添加连接│
│ ┌───────────────────────┐  ┌───────────────────────┐     │
│ │ ● 本地微信      默认  │  │ ● 同事机器            │     │
│ │   实时 WebView 预览   │  │   实时 WebView 预览   │     │
│ │   https://localhost… │  │   https://10.0.0.8…   │     │
│ │ 打开 刷新 编辑 删除  │  │ 打开 刷新 编辑 默认… │     │
│ └───────────────────────┘  └───────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

## 项目结构

```
.
├── App.tsx                 应用入口：mount + Window + NavStack
├── App.test.tsx            nsh test 测试（含预览墙与证书识别用例）
├── icon.png                应用图标（1024×1024），由 tools/make_icon.py 生成
├── nsh.json                应用配置：id、版本、图标、主题、外观、能力（capabilities）
├── theme.json              设计令牌（shadcn 风格 cssVars，深色科技配色）
├── tsconfig.json           继承 .nsh/tsconfig.json
├── tools/
│   └── make_icon.py        图标渲染脚本（Pillow，4× 超采样）
└── src/
    ├── components/
    │   ├── PreviewTile.tsx       预览墙的单张卡片（内嵌 WebView）
    │   └── TlsHelp.tsx           证书不受信任时的处理面板
    ├── models/connection.ts      Connection 模型与 JSON 往返
    ├── services/
    │   ├── storage.ts            基于 nsh `Storage` 的持久化
    │   ├── platform.ts           平台能力检测、openUrl、URL 规范化
    │   ├── tls.ts                证书错误识别与 HTTPS→HTTP 重试
    │   └── http.ts               Basic 认证头与 base64（不依赖 btoa）
    ├── store/connections.ts      连接状态（signal）：加载 / 增删改 / 设默认
    ├── nav.ts                    导航栈状态
    ├── ui/kit.tsx                基于 nsh/base 的主题化控件
    └── pages/
        ├── Home.tsx              控制台：预览墙 / 列表 / 搜索 / 主题
        ├── ConnectionForm.tsx    新增 / 编辑连接对话框
        └── WebViewPage.tsx       单连接全屏 WebView 页面
```

## 开发与验证

本项目**不依赖** Rust、Node.js 或 npm，只需要 `nsh` 命令行。

安装 `nsh`：

```bash
# macOS / Linux
curl -fsSL https://nsh.dev/install.sh | sh

# Windows (PowerShell)
irm https://nsh.dev/install.ps1 | iex
```

运行与检查：

```bash
nsh run        # 在桌面窗口中运行应用
nsh check      # 生成 .nsh/types 并做 TypeScript 类型检查
nsh test       # 无头运行 App.test.tsx
nsh build      # 构建产物
nsh package    # 打包为安装包
```

首次运行前会生成 `.nsh/`（类型声明与构建产物），已在 `.gitignore` 中排除。

## 持续集成

`.github/workflows/ci.yml` 在 GitHub Actions 上于 Linux 与 Windows 上安装 `nsh`，
并运行 `nsh check` 与 `nsh test`。无需本地工具链即可验证。

## 自动发布

`.github/workflows/release.yml` 在推送版本标签时自动打包并创建 GitHub Release：

- 触发：推送 `v*` 标签（如 `v5.0.0`）；或在 Actions 页面手动 `Run workflow`
  （填写 `tag` 可同时发布 Release，留空则只构建产物）。
- 各平台在**各自的 runner** 上原生打包（避免交叉编译）：
  - `windows-latest` → `nsh package --target windows`：`WeChat Selkies.zip` 与
    `WeChat Selkies-setup.exe`（runner 预装 Inno Setup 时自动生成安装器）。
  - `ubuntu-latest` → `nsh package --target linux`：`WeChat Selkies.tar.gz`。
  - `macos-latest` → `nsh package --target macos`：ad-hoc 签名的 `.app`，再压缩为 zip。
- 标签版本号会作为 `--app-version` 写入产物（`v5.0.0` → `5.0.0`）。
- 所有产物也会作为工作流 Artifact 上传，便于每次构建下载。

发布一个版本：

```bash
git tag v5.0.0
git push origin v5.0.0
```

## 证书（自签名 HTTPS）—— 自动绕过

wechat-selkies 同时开两个端口（见其 `docker-compose.yml`）：
**3000 = 明文 HTTP**，**3001 = HTTPS（默认自签名证书）**。

所以遇到自签名证书，**最直接的绕过就是不用 TLS，直接连 3000**：

```
http://<服务器IP>:3000
```

**应用会自动完成这件事，不需要你点任何按钮**：

1. 连接地址是 `https://<主机>:3001` 时，**首次加载就直接用** `http://<主机>:3000`
   （保留路径与查询参数）——不会出现证书警告，也不会先失败一次；
2. 也保留兜底：若其他 HTTPS 地址因证书不受信任加载失败，`onError` 识别后自动改写为
   对应 HTTP 地址并重新加载；
3. 成功后可用的映射会被记住（本地存储 `tlsPrefs`，`https://host:3001 → http://host:3000`）；
4. 若 HTTP 端口没暴露（连接失败），应用会自动退回 HTTPS 并显示「证书不受信任」面板，
   不会反复降级。

卡片和全屏页的标题旁会出现「**自动 HTTP**」标记；地址栏旁的「**切回 HTTPS**」
会记住「这个地址只用 TLS」，之后不再自动降级。面板里也可手动选择
「改用 HTTP :3001」（服务在该端口也接受明文时用）或「浏览器打开」。

> 注意：HTTP 不是安全上下文（secure context）。画面串流正常，但浏览器可能限制
> 剪贴板等需要安全上下文的能力。要完整功能请用 HTTPS + 信任证书，而不是 HTTP。

nsh 的 `WebView` 没有暴露证书错误回调（已检索 nsh 全部文档，无
`ignoreCertificateErrors` 之类开关），因此无法像 Flutter 版那样在应用内
「忽略证书校验」（即保留 HTTPS 但不校验证书）。上文的自动降级是纯 TSX 能达到的
最接近的行为。另一种彻底方案：

- **导入系统受信任根证书**（推荐，保留 HTTPS 全部能力）：
  - Windows：「受信任的根证书颁发机构」
  - macOS：钥匙串访问 → 系统 → 信任
  - Linux：`/usr/local/share/ca-certificates/` + `update-ca-certificates`
- **用 [mkcert](https://github.com/FiloSottile/mkcert) 签发**，并在客户端安装 mkcert 根证书；
- **反向代理 + 正式证书**（如 Caddy + 自己的域名）。

连接表单里的「忽略 SSL 证书错误」字段为兼容上游配置而保留，但**不生效**，界面上也有说明。

> 实验性（仅 Windows，未验证保证）：WebView2 会读取环境变量
> `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`，可在启动 exe 前设置
> `--ignore-certificate-errors` 尝试强制忽略证书（Chromium 全局开关，对所有页面生效）。
> 无效时请用 HTTP 端口或信任证书。要在应用内真正实现，需要 Rust 侧自定义 WebView 模块。

## 与上游 Flutter 版本的差异

- **忽略 SSL 证书错误**：原项目通过 flutter_inappwebview 的
  `onReceivedServerTrustAuthRequest` 实现；nsh 无此回调（见上节「证书」），
  改为**自动降级到明文 HTTP :3000** 并记住该地址，或用证书面板/系统信任证书。
- 应用内 WebView 在 Linux 桌面上不可用，与原项目一致：自动使用系统浏览器。
  此时预览墙的卡片显示占位提示，点击后交给系统浏览器打开。

## 许可

与原项目保持一致（见上游仓库）。
