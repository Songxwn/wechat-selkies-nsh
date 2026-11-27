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
- **版本 5.1.1**：修复「带 HTTP Basic 认证的连接预览白屏」；`ext/tls-native`（Rust）在 Windows 上自动接受不受信任证书，保留 HTTPS。

## 界面

```
┌──────────────────────────────────────────────────────────┐
│ ◼ WECHAT SELKIES                    控制台        v5.1.1  │
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
├── nsh.json                应用配置：id、版本、图标、主题、外观、能力、Rust 依赖
├── theme.json              设计令牌（shadcn 风格 cssVars，深色科技配色）
├── tsconfig.json           继承 .nsh/tsconfig.json
├── ext/
│   └── tls-native/         应用自己的 Rust 模块（nshm）：让 WebView 接受不受信任证书
│       ├── Cargo.toml
│       └── src/lib.rs      `#[native_module("tls-native")]`，导出 `Tls`
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

界面与业务逻辑是纯 TSX；只有 `ext/tls-native` 是一小块 Rust（处理 WebView 证书），
`nsh` 会用 Cargo 编译它，所以本机需要 Rust 工具链（[rustup](https://rustup.rs)）。
GitHub Actions 的 runner 已预装 Rust。

带 Rust crate 的应用，`nsh package` 会在本机从源码编译 runtime，所以 Linux 还需要
GTK 4 与 WebKitGTK 6.0 的开发包（否则 cargo 在 `glib-sys` 报 `Package glib-2.0 was not found`）：

```bash
sudo apt-get install -y libgtk-4-dev libwebkitgtk-6.0-dev clang pkg-config   # Debian / Ubuntu
sudo dnf install -y gtk4-devel webkitgtk6.0-devel clang                     # Fedora
sudo pacman -S --needed gtk4 webkitgtk-6.0 clang                            # Arch
```

`release.yml` 的 Linux job 已自动安装这些包。

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

## 证书（自签名 HTTPS）—— 自动接受不受信任证书

wechat-selkies 默认用**自签名证书**提供 `https://…:3001`，浏览器会直接拒绝。nsh 的
`WebView` 没有证书回调（Flutter 版用的是 flutter_inappwebview 的
`onReceivedServerTrustAuthRequest`），纯 TSX 无法在应用里「忽略证书校验」，所以这一版
把这件事交给原生层：`ext/tls-native`（Rust 模块）。

### Windows：应用内自动接受（推荐）

WebView2 启动浏览器进程时会读取进程环境变量
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`。应用在 `App.tsx` 里**在第一个 WebView 创建之前**
调用 `Tls.accept()`，把 `--ignore-certificate-errors` 加进去：

```rust
// ext/tls-native/src/lib.rs
unsafe { std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--ignore-certificate-errors") };
```

效果是**保留 HTTPS、不再弹证书错误**：页面仍是安全上下文，剪贴板等能力正常。
这等价于 Flutter 版的「忽略证书错误」，且对所有 WebView（预览墙里每一张卡片）都生效。

不想要这种行为（服务器证书本来就受信任）时，设置环境变量
`WECHAT_SELKIES_VERIFY_TLS=1` 启动即可恢复校验证书。

### macOS / Linux：没有等价开关

WKWebView 与 WebKitGTK 都不提供进程级的「忽略证书错误」开关，纯 TSX 又拿不到证书回调，
所以这两个平台仍会在页面被证书拦下时弹出「**证书不受信任**」面板，提供：

1. **改用 HTTP :3000** —— wechat-selkies 同时监听 3000 端口的明文 HTTP（见其
   `docker-compose.yml`），无需任何证书；代价是 HTTP 不是安全上下文，剪贴板等能力可能受限；
2. **改用 HTTP :3001**（服务在 HTTPS 端口也接受明文时）；
3. **浏览器打开** —— 系统浏览器允许手动「继续前往」；
4. 长期方案：把自签名证书导入**系统受信任根证书**，或用
   [mkcert](https://github.com/FiloSottile/mkcert) 签发并在客户端安装根证书，
   或前置 Caddy + 正式证书的反向代理。

> 想在 macOS / Linux 上也自动接受，需要在 nsh 的 Rust 端给 WebView 加证书回调
> （WKWebView 的 `didReceive challenge`、WebKitGTK 的 TLS 错误策略），这不是应用层能做的。
> 本项目的 `ext/tls-native` 已经是一个 Rust 模块，若上游 nsh 以后暴露该能力，这里可以直接接上。

连接表单里的「忽略 SSL 证书错误」字段为兼容上游配置而保留，但**不生效**（Windows 是全局忽略），界面上也有说明。

## 与上游 Flutter 版本的差异

- **忽略 SSL 证书错误**：原项目通过 flutter_inappwebview 的
  `onReceivedServerTrustAuthRequest` 实现；nsh 无此回调，本应用改用
  `ext/tls-native` 在 Windows 上让 WebView2 整体忽略证书错误（保留 HTTPS），
  macOS / Linux 仍用证书面板（HTTP 端口 / 浏览器 / 系统信任证书）。
- 应用内 WebView 在 Linux 桌面上不可用，与原项目一致：自动使用系统浏览器。
  此时预览墙的卡片显示占位提示，点击后交给系统浏览器打开。

## 许可

与原项目保持一致（见上游仓库）。
