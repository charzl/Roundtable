import { resolve } from 'node:path';
import { getProjectInfo } from './common.js';

/**
 * Linux 平台打包规划模块 / Linux Packaging Roadmap Module
 *
 * 预期输出目标 / Target Artifacts:
 * 1. Roundtable-<version>-linux-<arch>.AppImage (通用独立镜像 / Standalone AppImage)
 * 2. Roundtable-<version>-linux-<arch>.deb (Debian / Ubuntu 安装包 / Debian package)
 * 3. Roundtable-<version>-linux-<arch>.tar.gz (通用二进制压缩包 / Tarball binary)
 *
 * 构建条件 / Build Requirements:
 * - 推荐在 Linux GitHub Runner (`runs-on: ubuntu-latest`) 上执行
 * - 解压 Electron linux 预编译包，注入 app 资源，并配置 desktop 入口与图标
 */
export function buildLinuxApp(_rootDir = resolve('.')) {
  if (process.platform !== 'linux') {
    throw new Error('Linux 构建当前需在 Linux 环境执行（或配置 Linux GitHub Runner: runs-on: ubuntu-latest） / Linux build must run in Linux environment (or Linux GitHub Runner: runs-on: ubuntu-latest)');
  }
  throw new Error('Linux 打包尚未完全实现，请关注后续更新 / Linux packaging is planned and not yet fully implemented');
}

export function packageLinux(rootDir = resolve('.'), _options = {}) {
  const { version } = getProjectInfo(rootDir);
  console.log(`[Plan] Linux 平台打包规划目标版本 / Target Version: ${version}`);
  return buildLinuxApp(rootDir);
}
