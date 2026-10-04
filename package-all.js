#!/usr/bin/env node
/**
 * Unified Packaging Pipeline for Roundtable:
 * Primary Active Stacks:
 * 1. Swift Native macOS App (SwiftUI/AppKit) - ~0.48 MB
 * 2. Python / PySide6 Native Desktop App - ~27 MB
 *
 * Archived Reference Stack:
 * 3. JavaScript / Electron (Deprecated Reference) - ~123 MB
 *
 * Collects all artifacts into root `dist/` with consolidated checksums and manifest.
 */

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve('.');
const rootDist = join(root, 'dist');
mkdirSync(rootDist, { recursive: true });

function computeSha256(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

console.log('======================================================================');
console.log('🚀 ROUNDTABLE 应用打包流水线 / PACKAGING PIPELINE (PRIMARY: SWIFT & PYTHON)');
console.log('======================================================================\n');

const results = [];

// 1. Package Swift Native (Primary macOS Stack)
console.log('🍎 [1/3] 打包 Swift Native 原生 macOS 客户端 (Primary)...');
try {
  execSync('bash swift/package.sh', { stdio: 'inherit', cwd: root });
  const swiftDist = join(root, 'swift/dist');
  if (existsSync(swiftDist)) {
    for (const f of readdirSync(swiftDist)) {
      if (f.endsWith('.zip') || f.endsWith('.sha256')) {
        cpSync(join(swiftDist, f), join(rootDist, f));
      }
    }
  }
  results.push({ stack: 'Swift Native (SwiftUI/AppKit)', status: 'success' });
} catch (e) {
  console.error('⚠️ Swift 打包出错:', e.message);
  results.push({ stack: 'Swift Native (SwiftUI/AppKit)', status: 'failed', error: e.message });
}

// 2. Package Python / PySide6 (Primary Cross-Platform Stack)
console.log('\n🐍 [2/3] 打包 Python + PySide6 原生客户端 (Primary)...');
try {
  execSync('python3 python/package.py', { stdio: 'inherit', cwd: root });
  const pyDist = join(root, 'python/dist');
  if (existsSync(pyDist)) {
    for (const f of readdirSync(pyDist)) {
      if (f.endsWith('.zip') || f.endsWith('.sha256')) {
        cpSync(join(pyDist, f), join(rootDist, f));
      }
    }
  }
  results.push({ stack: 'Python (PySide6)', status: 'success' });
} catch (e) {
  console.error('⚠️ Python 打包出错:', e.message);
  results.push({ stack: 'Python (PySide6)', status: 'failed', error: e.message });
}

// 3. Package JavaScript / Electron (Deprecated Reference - Only if explicitly requested)
if (process.env.PACKAGE_DEPRECATED_JS === 'true') {
  console.log('\n📦 [3/3] 打包 JavaScript / Electron 客户端 (已废弃供参考 / Deprecated Reference)...');
  try {
    execSync('npm --prefix javascript-deprecated run package:mac', { stdio: 'inherit', cwd: root });
    const jsDist = existsSync(join(root, 'javascript-deprecated/dist')) ? join(root, 'javascript-deprecated/dist') : rootDist;
    for (const f of readdirSync(jsDist)) {
      if (f.startsWith('Roundtable-') && !f.includes('PySide') && !f.includes('Swift')) {
        const src = join(jsDist, f);
        const dest = join(rootDist, f);
        if (src !== dest && statSync(src).isFile()) cpSync(src, dest);
      }
    }
    results.push({ stack: 'JavaScript (Electron, Deprecated)', status: 'success' });
  } catch (e) {
    console.error('⚠️ JavaScript 打包出错:', e.message);
    results.push({ stack: 'JavaScript (Electron, Deprecated)', status: 'failed', error: e.message });
  }
} else {
  console.log('\n📦 [3/3] 跳过已废弃的 JavaScript / Electron 客户端打包 (保留代码供参考，可设 PACKAGE_DEPRECATED_JS=true 开启)...');
}

// 4. Consolidate Checksums & Manifest
console.log('\n📝 正在生成全套分发校验清单 / Consolidating checksums and manifest...');

const allFiles = readdirSync(rootDist).filter(f => f.endsWith('.dmg') || f.endsWith('.zip'));
const manifestEntries = [];
let checksumsContent = '';

for (const file of allFiles.sort()) {
  const filePath = join(rootDist, file);
  const sizeBytes = statSync(filePath).size;
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
  const hash = computeSha256(filePath);

  checksumsContent += `${hash}  ${file}\n`;

  let stack = 'Unknown';
  let category = 'Primary';
  if (file.includes('Swift')) {
    stack = 'Swift Native (macOS)';
    category = 'Primary';
  } else if (file.includes('PySide6')) {
    stack = 'Python (PySide6)';
    category = 'Primary';
  } else {
    stack = 'JavaScript (Electron)';
    category = 'Deprecated Reference';
  }

  manifestEntries.push({
    file,
    stack,
    category,
    platform: 'macos',
    arch: 'arm64',
    sizeBytes,
    sizeMb: `${sizeMb} MB`,
    sha256: hash
  });
}

writeFileSync(join(rootDist, 'checksums.sha256'), checksumsContent);
writeFileSync(join(rootDist, 'artifacts-manifest.json'), JSON.stringify(manifestEntries, null, 2));

console.log('\n======================================================================');
console.log('🎉 打包流水线完成汇总 / PACKAGING PIPELINE COMPLETE SUMMARY');
console.log('======================================================================');
console.log('| 分类 (Category) | 技术栈架构 (Stack) | 生成产物 (Artifact File) | 文件大小 (Size) | SHA256 (首8位) |');
console.log('|---|---|---|---|---|');
for (const entry of manifestEntries) {
  console.log(`| ${entry.category} | ${entry.stack} | \`${entry.file}\` | **${entry.sizeMb}** | \`${entry.sha256.substring(0, 8)}...\` |`);
}
console.log('\n📁 全部产物已归档至: ' + rootDist);
console.log('📄 统一校验文件: ' + join(rootDist, 'checksums.sha256'));
