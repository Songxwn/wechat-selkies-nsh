# WeChat Selkies · nsh 控制台

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
- **版本 5.0.0**：与上游 Flutter 应用保持一致。

## 界面

```
┌──────────────────────────────────────────────────────────┐
│ ◼ WECHAT SELKIES                    控制台        v5.0.0  │
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
├── App.test.tsx            nsh test 测试（对应原 widget_test.dart，含预览墙用例）
├── nsh.json                应用配置：id、版本、主题、外观、能力（capabilities）
├── theme.json              设计令牌（shadcn 风格 cssVars，深色科技配色）
├── tsconfig.json           继承 .nsh/tsconfig.json
└── src/
    ├── components/
    │   └── PreviewTile.tsx       预览墙的单张卡片（内嵌 WebView）
    ├── models/connection.ts      Connection 模型与 JSON 往返
    ├── services/
    │   ├── storage.ts            基于 nsh `Storage` 的持久化
    │   ├── platform.ts           平台能力检测、openUrl、URL 规范化
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

## 与上游 Flutter 版本的差异

- **忽略 SSL 证书错误**：原项目通过 flutter_inappwebview 的
  `onReceivedServerTrustAuthRequest` 实现。nsh 的 `WebView` 目前没有暴露证书错误回调
  （此类能力需要 Rust 侧支持），因此 `ignoreSsl` 字段仍然保留并可配置，但**尚未生效**。
  如需自签名证书场景，可改用系统浏览器打开连接。
- 应用内 WebView 在 Linux 桌面上不可用，与原项目一致：自动使用系统浏览器。
  此时预览墙的卡片显示占位提示，点击后交给系统浏览器打开。

## 许可

与原项目保持一致（见上游仓库）。
