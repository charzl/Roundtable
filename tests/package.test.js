import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

test('packaging produces valid DMG, ZIP and matching SHA256 checksums if built', () => {
  const distDir = resolve('dist');
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  const baseName = `Roundtable-${pkg.version}-mac-${process.arch}`;
  const dmgPath = join(distDir, `${baseName}.dmg`);
  const zipPath = join(distDir, `${baseName}.zip`);
  const sha256Path = join(distDir, `${baseName}.sha256`);

  if (!existsSync(dmgPath) || !existsSync(zipPath) || !existsSync(sha256Path)) {
    // If not built yet, skip content check
    return;
  }

  const checksumContent = readFileSync(sha256Path, 'utf8');
  const dmgHash = createHash('sha256').update(readFileSync(dmgPath)).digest('hex');
  const zipHash = createHash('sha256').update(readFileSync(zipPath)).digest('hex');

  assert.ok(checksumContent.includes(`${dmgHash}  ${baseName}.dmg`), 'DMG checksum must match');
  assert.ok(checksumContent.includes(`${zipHash}  ${baseName}.zip`), 'ZIP checksum must match');
});
