import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { getProjectInfo, computeSha256 } from '../scripts/packaging/common.js';

test('getProjectInfo extracts valid project metadata', () => {
  const info = getProjectInfo(resolve('.'));
  assert.equal(info.name, 'roundtable-desktop');
  assert.equal(info.displayName, 'Roundtable');
  assert.ok(/^[0-9]+\.[0-9]+\.[0-9]+/.test(info.version));
});

test('computeSha256 produces valid 64-char hex digest', () => {
  const hash = computeSha256(resolve('package.json'));
  assert.equal(hash.length, 64);
  assert.ok(/^[0-9a-f]{64}$/.test(hash));
});

test('packaging produces valid DMG, ZIP and matching SHA256 checksums if built', () => {
  const distDir = resolve('dist');
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  const baseName = `Roundtable-${pkg.version}-mac-${process.arch}`;
  const dmgPath = join(distDir, `${baseName}.dmg`);
  const zipPath = join(distDir, `${baseName}.zip`);
  const sha256Path = join(distDir, `${baseName}.sha256`);

  if (!existsSync(dmgPath) || !existsSync(zipPath) || !existsSync(sha256Path)) {
    return;
  }

  const checksumContent = readFileSync(sha256Path, 'utf8');
  const dmgHash = createHash('sha256').update(readFileSync(dmgPath)).digest('hex');
  const zipHash = createHash('sha256').update(readFileSync(zipPath)).digest('hex');

  assert.ok(checksumContent.includes(`${dmgHash}  ${baseName}.dmg`), 'DMG checksum must match');
  assert.ok(checksumContent.includes(`${zipHash}  ${baseName}.zip`), 'ZIP checksum must match');

  const manifestPath = join(distDir, 'artifacts-manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest), 'Manifest must be an array');
    const entry = manifest.find(e => e.platform === 'macos' && e.arch === process.arch);
    assert.ok(entry, 'Manifest must contain macos entry');
  }
});
