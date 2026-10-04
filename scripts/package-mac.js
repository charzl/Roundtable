import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

if (process.platform !== 'darwin') {
  throw new Error('此打包脚本需在 macOS 执行');
}

const rootDir = resolve('.');
const pkgPath = join(rootDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '0.0.0';
const arch = process.arch; // 'arm64' or 'x64'

const appPath = join(rootDir, 'dist/Roundtable.app');
if (!existsSync(appPath)) {
  console.log('未找到 dist/Roundtable.app，正在先执行 build-mac.js...');
  const buildResult = spawnSync(process.execPath, [join(rootDir, 'scripts/build-mac.js')], {
    stdio: 'inherit'
  });
  if (buildResult.status !== 0) {
    throw new Error(`build-mac 失败，退出码：${buildResult.status}`);
  }
}

const distDir = join(rootDir, 'dist');
const baseName = `Roundtable-${version}-mac-${arch}`;
const dmgPath = join(distDir, `${baseName}.dmg`);
const zipPath = join(distDir, `${baseName}.zip`);
const checksumPath = join(distDir, `${baseName}.sha256`);

console.log(`\n正在为 macOS (${arch}) 打包发布文件：`);
console.log(`- 目标应用：${appPath}`);

// 1. 创建 DMG
console.log(`\n[1/3] 生成 DMG 镜像: ${dmgPath}...`);
const hdiutilResult = spawnSync('/usr/bin/hdiutil', [
  'create',
  '-volname', 'Roundtable',
  '-srcfolder', appPath,
  '-ov',
  '-format', 'UDZO',
  dmgPath
], { stdio: 'inherit' });

if (hdiutilResult.status !== 0) {
  throw new Error('hdiutil 生成 DMG 失败');
}

// 2. 创建 ZIP (保留权限和软链接)
console.log(`\n[2/3] 生成 ZIP 压缩包 (ditto): ${zipPath}...`);
const dittoResult = spawnSync('/usr/bin/ditto', [
  '-c',
  '-k',
  '--sequesterRsrc',
  '--keepParent',
  appPath,
  zipPath
], { stdio: 'inherit' });

if (dittoResult.status !== 0) {
  throw new Error('ditto 生成 ZIP 失败');
}

// 3. 计算 SHA256 校验和
console.log(`\n[3/3] 计算 SHA256 校验和...`);
function getSha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

const dmgSha256 = getSha256(dmgPath);
const zipSha256 = getSha256(zipPath);
const dmgSizeMB = (statSync(dmgPath).size / (1024 * 1024)).toFixed(2);
const zipSizeMB = (statSync(zipPath).size / (1024 * 1024)).toFixed(2);

const checksumContent = [
  `${dmgSha256}  ${baseName}.dmg`,
  `${zipSha256}  ${baseName}.zip`
].join('\n') + '\n';

writeFileSync(checksumPath, checksumContent, 'utf8');

console.log(`\n打包完成！产物列表：`);
console.log(`  - DMG: ${dmgPath} (${dmgSizeMB} MB)`);
console.log(`    SHA256: ${dmgSha256}`);
console.log(`  - ZIP: ${zipPath} (${zipSizeMB} MB)`);
console.log(`    SHA256: ${zipSha256}`);
console.log(`  - 校验文件: ${checksumPath}`);
