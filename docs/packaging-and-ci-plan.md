# 打包架构规划与 GitHub CI 触发设计 / Multi-Platform Packaging Architecture & GitHub CI Trigger Design

本文档以中英双语阐述 Roundtable 桌面端的多平台打包架构规划、产物标准以及 GitHub Actions Runner 的触发与发布机制。  
This document explains the multi-platform packaging architecture, artifact specifications, and GitHub Actions Runner trigger & release mechanisms for Roundtable desktop in both Chinese and English.

---

## 一、多平台打包架构规划 / Multi-Platform Packaging Architecture

Roundtable 采用模块化分层打包架构，将公共逻辑（元数据提取、哈希校验、清单记录）与各操作系统（macOS、Windows、Linux）的分发打包解耦。  
Roundtable adopts a modular, tiered packaging architecture, decoupling common tasks (metadata extraction, checksums, manifest generation) from platform-specific packagers (macOS, Windows, Linux).

### 1. 目录结构 / Directory Structure

```text
scripts/
├── package.js                 # 统一打包 CLI 入口 / Unified packaging CLI entrypoint
├── package-mac.js             # macOS 快捷打包入口 / macOS shortcut packaging script
├── build-mac.js               # macOS 应用捆绑构建 / macOS app bundle builder
└── packaging/
    ├── common.js              # 公共模块（版本信息、SHA256 计算、manifest 清单生成）/ Common utilities
    ├── mac.js                 # macOS 打包器（.app 构造、ad-hoc 签名、hdiutil DMG、ditto ZIP）/ macOS packager
    ├── win.js                 # Windows 打包规划器（NSIS 安装包、绿色 Portable ZIP）/ Windows packager roadmap
    └── linux.js               # Linux 打包规划器（AppImage、.deb、.tar.gz）/ Linux packager roadmap
```

### 2. 各平台产物标准 / Artifact Specifications by Platform

| 平台 / Platform | 目标架构 / Arch | 交付格式 / Formats | 说明 / Description | 当前状态 / Status |
| :--- | :--- | :--- | :--- | :--- |
| **macOS** | ARM64 (Apple Silicon) | `.dmg` + `.zip` + `.sha256` | 原生 `hdiutil` UDZO 镜像与保留权限的 `ditto` 压缩包 / Native UDZO DMG and ditto ZIP | **已实现并验证 / Implemented & Verified** |
| **macOS** | x64 (Intel) | `.dmg` + `.zip` + `.sha256` | 适配 Intel 架构 Mac 设备 / Intel Mac bundle | 已具备脚本能力 / Script Ready |
| **Windows** | x64 / ARM64 | `.exe` + `.zip` + `.sha256` | NSIS 安装程序 (`-setup.exe`) + 绿色便携包 (`-portable.zip`) / NSIS installer and portable zip | 规划中 / Planned (`packaging/win.js`) |
| **Linux** | x64 / ARM64 | `.AppImage` + `.deb` + `.tar.gz` | 通用独立镜像、Debian 软件包与绿色压缩包 / AppImage, Deb, Tarball | 规划中 / Planned (`packaging/linux.js`) |

### 3. 统一打包入口与清单机制 / Unified Entrypoint & Manifest

```sh
# 默认构建当前操作系统与当前 CPU 架构 / Package for current OS and architecture
npm run package

# 指定目标平台与架构 / Explicitly specify target platform and architecture
node scripts/package.js --platform=macos --arch=arm64
node scripts/package.js --platform=windows --arch=x64
node scripts/package.js --platform=linux --arch=x64
```

打包完成后，统一在 `dist/artifacts-manifest.json` 记录所有产物的文件名、路径、字节大小以及 SHA256 校验和。  
Upon completion, `dist/artifacts-manifest.json` automatically records file names, paths, sizes, and SHA256 checksums across all platforms.

---

## 二、GitHub Actions CI/CD 触发机制 / GitHub Actions Trigger Mechanisms

工作流配置文件位于 [.github/workflows/build-macos.yml](../.github/workflows/build-macos.yml)，支持 4 种触发方式：  
The workflow is configured in [.github/workflows/build-macos.yml](../.github/workflows/build-macos.yml) with 4 triggering modes:

### 1. 自动触发：分支推送 / Push Trigger
- **中文**：向 `main` 或特性分支推送代码时自动触发。云端 Runner 自动拉取代码、安装依赖、运行 `npm run check` 与 `npm test`，并执行打包，上传保留 90 天的 Artifacts 供下载测试。
- **English**: Triggered automatically on pushes to `main` or feature branches. Cloud runners clone code, install dependencies, run syntax checks and unit tests, compile packages, and upload workflow artifacts (retained for 90 days).

### 2. 自动触发：合并请求检查 / Pull Request Trigger
- **中文**：发起针对 `main` 分支的 PR 或向已有 PR 推送 commit 时触发，作为门禁自动验证测试与打包。
- **English**: Triggered on PR opening or updates targeting `main`, serving as a quality gate ensuring tests and packaging succeed before merge.

### 3. 自动发布：版本标签推送 / Tag Release Trigger
- **中文**：推送形如 `v*` 的版本标签时自动触发：
  ```sh
  git tag v0.3.0
  git push origin v0.3.0
  ```
  Runner 在完成测试与打包后，会自动创建 GitHub Release，并将 `.dmg`、`.zip`、`.sha256` 挂载为正式 Release Assets 供用户下载。
- **English**: Triggered on pushing version tags matching `v*`. The runner builds packages and publishes a GitHub Release, attaching `.dmg`, `.zip`, and `.sha256` assets automatically.

### 4. 手动触发：即时运行 / Manual Trigger (`workflow_dispatch`)
- **中文**：无需打 Tag 即可随时手动触发构建或发布。
  - **网页端**：在仓库 **Actions** -> **Build macOS Packages** -> 点击 **Run workflow**（可勾选 `create_release` 参数）。
  - **命令行**：
    ```sh
    # 普通构建 / Standard build
    gh workflow run build-macos.yml

    # 构建并发布 Release / Build and publish Release
    gh workflow run build-macos.yml -f create_release=true
    ```
- **English**: Run on demand anytime without pushing tags.
  - **Web UI**: Navigate to **Actions** -> **Build macOS Packages** -> click **Run workflow** (optional `create_release` checkbox).
  - **CLI (`gh`)**:
    ```sh
    gh workflow run build-macos.yml
    gh workflow run build-macos.yml -f create_release=true
    ```

---

## 三、多平台扩展路线 / Multi-Platform Roadmap

当引入 Windows 和 Linux 打包时，工作流可平行扩展为多 OS 独立 Job：  
When Windows and Linux packagers are implemented, the workflow expands seamlessly into parallel jobs:

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
    # 统一汇总所有平台产物并发布 / Collect and publish all platform artifacts together
```
