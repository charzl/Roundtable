# 打包架构规划与 GitHub CI 触发设计

本文档阐述 Roundtable 桌面端的多平台打包架构规划、产物标准以及 GitHub Actions Runner 的触发与发布机制。

---

## 一、多平台打包架构规划

Roundtable 采用模块化分层打包架构，将公共逻辑（元数据提取、哈希校验、清单记录）与各操作系统（macOS、Windows、Linux）的分发打包解耦。

### 1. 目录结构

```text
scripts/
├── package.js                 # 统一打包 CLI 入口（自动识别平台或按参数分发）
├── package-mac.js             # macOS 快捷打包入口（向后兼容）
├── build-mac.js               # macOS 应用捆绑构建（向后兼容）
└── packaging/
    ├── common.js              # 公共模块（版本信息、SHA256 计算、manifest 清单生成）
    ├── mac.js                 # macOS 专属打包器（.app 构造、ad-hoc 签名、hdiutil DMG、ditto ZIP）
    ├── win.js                 # Windows 平台打包规划器（NSIS 安装包、绿色 Portable ZIP）
    └── linux.js               # Linux 平台打包规划器（AppImage、.deb、.tar.gz）
```

### 2. 各平台预期产物标准

| 平台 | 目标架构 | 交付格式 | 说明 | 当前状态 |
| :--- | :--- | :--- | :--- | :--- |
| **macOS** | ARM64 (Apple Silicon) | `.dmg` + `.zip` + `.sha256` | 原生 `hdiutil` UDZO 镜像与保留权限的 `ditto` 压缩包 | **已实现并验证** |
| **macOS** | x64 (Intel) | `.dmg` + `.zip` + `.sha256` | 适配 Intel 架构 Mac 设备 | 已具备脚本能力 |
| **Windows** | x64 / ARM64 | `.exe` + `.zip` + `.sha256` | NSIS 安装程序 (`-setup.exe`) + 绿色免安装压缩包 (`-portable.zip`) | 规划中（`packaging/win.js`） |
| **Linux** | x64 / ARM64 | `.AppImage` + `.deb` + `.tar.gz` | 通用独立镜像、Debian 系包与绿色压缩包 | 规划中（`packaging/linux.js`） |

### 3. 统一打包入口与清单机制

开发者或 CI 统一使用如下命令执行打包：

```sh
# 默认构建当前操作系统与当前 CPU 架构
npm run package

# 指定目标平台与架构（跨平台或统一指定）
node scripts/package.js --platform=macos --arch=arm64
node scripts/package.js --platform=windows --arch=x64
node scripts/package.js --platform=linux --arch=x64
```

打包完成后，统一在 `dist/artifacts-manifest.json` 记录所有产物的文件名、路径、字节大小、可读大小以及 SHA256 校验和，供 CI 发布与下载校验。

---

## 二、GitHub Actions CI/CD 触发机制

工作流配置文件位于 [.github/workflows/build-macos.yml](../.github/workflows/build-macos.yml)。支持以下四种触发方式：

### 1. 自动触发：分支推送（Push）
- **触发条件**：向 `main` 或特性分支推送代码。
- **动作**：GitHub 云端 Runner 自动拉取代码、安装依赖、运行 `npm run check` 语法检查与 `npm test` 单元测试，并在 Runner 上执行 `npm run package` 构建打包。
- **产物**：自动生成 GitHub Actions Artifacts（保留 90 天），可在每次构建的详情页直接下载。

### 2. 自动触发：合并请求检查（Pull Request）
- **触发条件**：发起针对 `main` 分支的 PR，或向已有 PR 推送新 commit。
- **动作**：自动触发门禁检查与打包测试，确保新代码在云端虚拟机中测试通过且能成功打包，绿灯后方可安全合入。

### 3. 自动发布：版本标签推送（Git Tag / Release）
- **触发条件**：推送形如 `v*` 的版本标签，例如：
  ```sh
  git tag v0.3.0
  git push origin v0.3.0
  ```
- **动作**：
  1. Runner 自动完成测试与打包；
  2. 触发 `release` 任务，自动在 GitHub 创建正式 Release；
  3. 自动将生成的 `.dmg`、`.zip` 及 `.sha256` 附件上传至 Release 页面，用户可直接点击下载最新发布包。

### 4. 手动触发：即时运行（workflow_dispatch）
- **适用场景**：临时需要最新安装包，或无需打 tag 即想发布 Release。
- **网页端操作**：
  1. 打开 GitHub 仓库页面，点击顶部 **Actions** 标签；
  2. 在左侧选择 **Build macOS Packages** 工作流；
  3. 点击右侧 **Run workflow** 下拉按钮；
  4. 选择目标分支，可勾选 `Create a GitHub Release with built packages` 参数；
  5. 点击绿色 **Run workflow** 按钮启动构建。
- **命令行操作**（通过 `gh` CLI）：
  ```sh
  # 普通构建并产出 Artifacts
  gh workflow run build-macos.yml

  # 构建并直接发布为 GitHub Release
  gh workflow run build-macos.yml -f create_release=true
  ```

---

## 三、后续多平台扩展路线

当引入 Windows 和 Linux 打包时，GitHub Actions 工作流可无缝扩展为跨平台矩阵任务：

```yaml
jobs:
  build-macos:
    runs-on: macos-14
    steps:
      - run: npm run package -- --platform=macos --arch=arm64

  build-windows:
    runs-on: windows-latest
    steps:
      - run: npm run package -- --platform=windows --arch=x64

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - run: npm run package -- --platform=linux --arch=x64

  release:
    needs: [build-macos, build-windows, build-linux]
    # 汇总下载所有平台产物并统一发布
```
这种结构使各平台构建独立隔离、互不阻塞，单平台的失败不影响其他平台的包生成。
