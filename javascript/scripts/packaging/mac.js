import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, renameSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import electronPath from 'electron';
import { migrateLegacyData } from '../../src/shared/storage.js';
import { getProjectInfo, computeSha256, generateChecksumFile, generateManifest } from './common.js';

export function buildMacApp(rootDir = resolve('.')) {
  if (process.platform !== 'darwin') {
    throw new Error('macOS 打包只能在 macOS 系统上执行');
  }

  const target = join(rootDir, 'dist/Roundtable.app');
  const source = resolve(electronPath, '../../..');
  if (!existsSync(join(source, 'Contents/Info.plist'))) {
    throw new Error('未找到 Electron.app 模板');
  }

  // 保留旧版本遗留数据迁移
  migrateLegacyData(
    join(homedir(), 'Library/Application Support/Roundtable/data'),
    [
      join(target, 'Contents/Resources/app/.roundtable'),
      resolve(rootDir, '.roundtable'),
      join(homedir(), 'Library/Application Support/roundtable-desktop/data')
    ]
  );

  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true, verbatimSymlinks: true });

  const resources = join(target, 'Contents/Resources');
  const appDir = join(resources, 'app');
  mkdirSync(appDir, { recursive: true });

  for (const file of ['src', 'ui', 'shared', 'LICENSE', 'NOTICE', 'third_party']) {
    const srcPath = existsSync(join(rootDir, file)) ? join(rootDir, file) : join(rootDir, '..', file);
    if (existsSync(srcPath)) cpSync(srcPath, join(appDir, file), { recursive: true });
  }

  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  delete pkg.devDependencies;
  delete pkg.build;
  writeFileSync(join(appDir, 'package.json'), JSON.stringify(pkg, null, 2));

  for (const name of ['LICENSE', 'LICENSES.chromium.html']) {
    const file = resolve(electronPath, '../../../../', name);
    if (existsSync(file)) cpSync(file, join(resources, 'electron-' + name));
  }

  renameSync(join(target, 'Contents/MacOS/Electron'), join(target, 'Contents/MacOS/Roundtable'));
  const plist = join(target, 'Contents/Info.plist');
  for (const [key, value] of Object.entries({
    CFBundleExecutable: 'Roundtable',
    CFBundleName: 'Roundtable',
    CFBundleDisplayName: 'Roundtable',
    CFBundleIdentifier: 'local.roundtable.desktop',
    CFBundleShortVersionString: pkg.version,
    CFBundleVersion: pkg.version
  })) {
    const r = spawnSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plist], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
  }

  const signed = spawnSync('/usr/bin/codesign', [
    '--force',
    '--deep',
    '--sign', '-',
    '--preserve-metadata=entitlements,flags',
    target
  ], { encoding: 'utf8' });
  if (signed.status !== 0) throw new Error(signed.stderr);

  return target;
}

export function packageMac(rootDir = resolve('.'), options = {}) {
  const { version } = getProjectInfo(rootDir);
  const arch = options.arch || process.arch;

  const appPath = join(rootDir, 'dist/Roundtable.app');
  if (!existsSync(appPath) || options.rebuild) {
    buildMacApp(rootDir);
  }

  const distDir = join(rootDir, 'dist');
  const baseName = `Roundtable-${version}-mac-${arch}`;
  const dmgPath = join(distDir, `${baseName}.dmg`);
  const zipPath = join(distDir, `${baseName}.zip`);
  const checksumPath = join(distDir, `${baseName}.sha256`);

  console.log(`\n正在为 macOS (${arch}) 打包分发文件 / Packaging distribution files for macOS (${arch})...`);

  // 1. 生成 DMG / Generate DMG
  console.log(`[1/3] 生成 DMG 镜像 / Generating DMG image: ${dmgPath}`);
  const hdiutil = spawnSync('/usr/bin/hdiutil', [
    'create',
    '-volname', 'Roundtable',
    '-srcfolder', appPath,
    '-ov',
    '-format', 'UDZO',
    dmgPath
  ], { stdio: 'inherit' });
  if (hdiutil.status !== 0) throw new Error('hdiutil 生成 DMG 失败 / hdiutil failed to generate DMG');

  // 2. 生成 ZIP / Generate ZIP
  console.log(`[2/3] 生成 ZIP 压缩包 (ditto) / Generating ZIP archive (ditto): ${zipPath}`);
  const ditto = spawnSync('/usr/bin/ditto', [
    '-c',
    '-k',
    '--sequesterRsrc',
    '--keepParent',
    appPath,
    zipPath
  ], { stdio: 'inherit' });
  if (ditto.status !== 0) throw new Error('ditto 生成 ZIP 失败 / ditto failed to generate ZIP');

  // 3. 生成校验和及清单 / Generate checksums and manifest
  console.log(`[3/3] 生成 SHA256 校验和与清单 / Generating SHA256 checksums and manifest...`);
  generateChecksumFile([dmgPath, zipPath], checksumPath);
  generateManifest({
    rootDir,
    platform: 'macos',
    arch,
    files: [dmgPath, zipPath, checksumPath]
  });

  return {
    platform: 'macos',
    arch,
    dmg: dmgPath,
    zip: zipPath,
    checksum: checksumPath
  };
}
