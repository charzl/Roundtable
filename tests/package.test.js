import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { getProjectInfo, computeSha256 } from '../scripts/packaging/common.js';
import { packageWin } from '../scripts/packaging/win.js';
import { packageLinux } from '../scripts/packaging/linux.js';

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

test('packageWin and packageLinux guard platform requirements', () => {
  if (process.platform !== 'win32') {
    assert.throws(() => packageWin(resolve('.')), /Windows/);
  }
  if (process.platform !== 'linux') {
    assert.throws(() => packageLinux(resolve('.')), /Linux/);
  }
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
    assert.ok(Array.isArray(entry.artifacts), 'Entry must have artifacts array');
    for (const art of entry.artifacts) {
      assert.ok(existsSync(art.path), `Artifact file ${art.file} must exist`);
      assert.equal(statSync(art.path).size, art.sizeBytes, `Artifact ${art.file} sizeBytes must match disk`);
      assert.equal(computeSha256(art.path), art.sha256, `Artifact ${art.file} sha256 must match`);
    }
  }
});

test('built macOS app bundle has expected files and sanitized package.json if built', () => {
  const appDir = resolve('dist/Roundtable.app');
  if (!existsSync(appDir)) return;

  const plist = readFileSync(join(appDir, 'Contents/Info.plist'), 'utf8');
  assert.ok(plist.includes('local.roundtable.desktop'), 'Info.plist must have bundle identifier');
  assert.ok(plist.includes('Roundtable'), 'Info.plist must have app name');

  assert.ok(existsSync(join(appDir, 'Contents/MacOS/Roundtable')), 'App executable must exist');

  const appPkgPath = join(appDir, 'Contents/Resources/app/package.json');
  assert.ok(existsSync(appPkgPath), 'Bundled package.json must exist');
  const appPkg = JSON.parse(readFileSync(appPkgPath, 'utf8'));
  assert.equal(appPkg.devDependencies, undefined, 'devDependencies must be stripped from bundle');
  assert.equal(appPkg.main, 'src/desktop/main.js', 'Bundled package.json main entry must point to main.js');

  assert.ok(existsSync(join(appDir, 'Contents/Resources/app/src/desktop/main.js')), 'Main process script must exist');
  assert.ok(existsSync(join(appDir, 'Contents/Resources/app/ui/index.html')), 'UI index.html must exist');
});
