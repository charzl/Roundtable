import { mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
export class Store {
  constructor(root) { this.root = root; mkdirSync(root, { recursive: true, mode: 0o700 }); }
  dir(id) { if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('无效会议编号'); return join(this.root, id); }
  save(meeting) {
    const dir = this.dir(meeting.id); mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = join(dir, 'meeting.json');
    writeFileSync(file + '.tmp', JSON.stringify(meeting, null, 2), { mode: 0o600 }); renameSync(file + '.tmp', file);
  }
  load(id) { return JSON.parse(readFileSync(join(this.dir(id), 'meeting.json'), 'utf8')); }
  list() {
    return readdirSync(this.root, { withFileTypes: true }).filter(e => e.isDirectory() && existsSync(join(this.root, e.name, 'meeting.json'))).map(e => this.load(e.name)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  artifacts(id, calls) {
    return calls.map(call => {
      const files = {};
      for (const name of ['prompt.md', 'raw.jsonl', 'stderr.txt', 'manifest.json']) {
        const path = join(this.dir(id), 'calls', call.id, name);
        files[name] = existsSync(path) ? readFileSync(path, 'utf8') : null;
      }
      return { callId: call.id, participant: call.participant, files };
    });
  }
  ledger(id) {
    try { return readFileSync(join(this.dir(id), 'research.jsonl'), 'utf8').split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }); }
    catch { return []; }
  }
  append(id, entry) { appendFileSync(join(this.dir(id), 'research.jsonl'), JSON.stringify(entry) + '\n'); }
}
