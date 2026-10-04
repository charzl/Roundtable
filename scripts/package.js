import { resolve } from 'node:path';
import { packageMac } from './packaging/mac.js';
import { packageWin } from './packaging/win.js';
import { packageLinux } from './packaging/linux.js';
import { getProjectInfo } from './packaging/common.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    platform: null,
    arch: process.arch,
    rebuild: false
  };

  for (const arg of args) {
    if (arg.startsWith('--platform=')) {
      options.platform = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--arch=')) {
      options.arch = arg.split('=')[1].toLowerCase();
    } else if (arg === '--rebuild') {
      options.rebuild = true;
    }
  }

  if (!options.platform) {
    if (process.platform === 'darwin') options.platform = 'macos';
    else if (process.platform === 'win32') options.platform = 'windows';
    else if (process.platform === 'linux') options.platform = 'linux';
    else options.platform = process.platform;
  }

  return options;
}

const rootDir = resolve('.');
const options = parseArgs();
const project = getProjectInfo(rootDir);

console.log(`========================================`);
console.log(`Roundtable 统一打包器 / Unified Packager`);
console.log(`版本 / Version: ${project.version}`);
console.log(`目标平台 / Target Platform: ${options.platform}`);
console.log(`目标架构 / Target Architecture: ${options.arch}`);
console.log(`========================================`);

try {
  let result;
  switch (options.platform) {
    case 'macos':
    case 'darwin':
    case 'mac':
      result = packageMac(rootDir, options);
      break;
    case 'windows':
    case 'win32':
    case 'win':
      result = packageWin(rootDir, options);
      break;
    case 'linux':
      result = packageLinux(rootDir, options);
      break;
    default:
      throw new Error(`不支持的目标平台 / Unsupported platform: ${options.platform}`);
  }

  console.log(`\n打包成功！清单已记录至 / Packaging succeeded! Manifest saved to: dist/artifacts-manifest.json`);
} catch (err) {
  console.error(`\n打包出错 / Packaging error: ${err.message}`);
  process.exit(1);
}
