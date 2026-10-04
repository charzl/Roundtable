import { resolve } from 'node:path';
import { getProjectInfo } from './common.js';

/**
 * Windows 平台打包规划模块
 *
 * 预期输出目标：
 * 1. Roundtable-<version>-win-<arch>-setup.exe (NSIS 安装包)
 * 2. Roundtable-<version>-win-<arch>-portable.zip (绿色免安装版)
 *
 * 构建条件：
 * - 推荐在 Windows GitHub Runner (`runs-on: windows-latest`) 上执行
 * - 解压 Electron win32 预编译包，注入 app 资源，并重命名可执行文件
 */
export function buildWinApp(_rootDir = resolve('.')) {
  if (process.platform !== 'win32') {
    throw new Error('Windows 构建当前需在 Windows 环境执行（或配置 Windows GitHub Runner: runs-on: windows-latest）');
  }
  throw new Error('Windows 打包尚未完全实现，请关注后续更新');
}

export function packageWin(rootDir = resolve('.'), _options = {}) {
  const { version } = getProjectInfo(rootDir);
  console.log(`[Plan] Windows 平台打包规划目标版本: ${version}`);
  return buildWinApp(rootDir);
}
