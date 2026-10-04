import { mkdirSync, existsSync, readdirSync, readFileSync, cpSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

// Copies legacy data before updates. Never overwrites a different meeting or removes a source.
export function migrateLegacyData(destination, sources) {
  destination = resolve(destination);
  mkdirSync(join(destination, 'meetings'), { recursive: true, mode: 0o700 });
  const migrated = [], conflicts = [];
  for (const candidate of new Set(sources.map(source => resolve(source)))) {
    if (candidate === destination || !existsSync(join(candidate, 'meetings'))) continue;
    for (const entry of readdirSync(join(candidate, 'meetings'), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const source = join(candidate, 'meetings', entry.name), file = join(source, 'meeting.json');
      if (!existsSync(file)) continue;
      const original = readFileSync(file); const meeting = JSON.parse(original);
      if (meeting.id !== entry.name || !/^[a-zA-Z0-9-]+$/.test(meeting.id)) throw new Error('Invalid legacy meeting identity');
      const target = join(destination, 'meetings', entry.name);
      if (existsSync(target)) {
        if (existsSync(join(target, 'meeting.json')) && readFileSync(join(target, 'meeting.json')).equals(original)) continue;
        const digest = createHash('sha256').update(candidate).update(original).digest('hex').slice(0, 16);
        const backup = join(destination, 'migration-conflicts', digest, entry.name);
        mkdirSync(join(destination, 'migration-conflicts', digest), { recursive: true, mode: 0o700 });
        if (!existsSync(backup)) cpSync(source, backup, { recursive: true, errorOnExist: true, force: false });
        conflicts.push({ id: entry.name, source: candidate, backup }); continue;
      }
      cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
      if (!readFileSync(join(target, 'meeting.json')).equals(original)) throw new Error('Legacy copy verification failed');
      migrated.push({ id: entry.name, source: candidate });
    }
    if (!existsSync(join(destination, 'shared')) && existsSync(join(candidate, 'shared'))) cpSync(join(candidate, 'shared'), join(destination, 'shared'), { recursive: true });
  }
  if (migrated.length || conflicts.length) {
    const path = join(destination, 'migration-history.json');
    const history = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
    history.push({ at: new Date().toISOString(), migrated, conflicts });
    writeFileSync(path, JSON.stringify(history, null, 2), { mode: 0o600 });
  }
  return { migrated, conflicts };
}
