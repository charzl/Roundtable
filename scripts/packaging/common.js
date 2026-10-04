import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, basename } from 'node:path';

export function getProjectInfo(rootDir = resolve('.')) {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  return {
    name: pkg.name || 'roundtable-desktop',
    displayName: 'Roundtable',
    version: pkg.version || '0.0.0',
    description: pkg.description || ''
  };
}

export function computeSha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

export function generateChecksumFile(filePaths, outputPath) {
  const lines = filePaths.map(filePath => {
    const hash = computeSha256(filePath);
    return `${hash}  ${basename(filePath)}`;
  });
  writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
  return lines;
}

export function generateManifest({ rootDir = resolve('.'), platform, arch, files }) {
  const manifestPath = join(rootDir, 'dist/artifacts-manifest.json');
  const existing = (() => {
    try { return JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { return []; }
  })();

  const newEntry = {
    platform,
    arch,
    updatedAt: new Date().toISOString(),
    artifacts: files.map(filePath => ({
      file: basename(filePath),
      path: filePath,
      sizeBytes: statSync(filePath).size,
      sizeMB: (statSync(filePath).size / (1024 * 1024)).toFixed(2),
      sha256: computeSha256(filePath)
    }))
  };

  const filtered = existing.filter(e => !(e.platform === platform && e.arch === arch));
  filtered.push(newEntry);
  writeFileSync(manifestPath, JSON.stringify(filtered, null, 2), 'utf8');
  return newEntry;
}
