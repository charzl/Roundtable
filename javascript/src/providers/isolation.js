import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function isolationAvailable() { return process.platform === 'darwin' && existsSync('/usr/bin/sandbox-exec'); }
// Deny the application's data tree, except this call's own projection/artifacts.
// This covers descendants, including native file tools and stdio MCP processes.
// It does not isolate remote services or a provider's pre-existing external memory.
export function isolateInvocation(executable, args, { callDir, protectedRoots }) {
  if (!isolationAvailable()) throw new Error('本机不支持独立调查的文件隔离；请使用讨论模式');
  const own = realpathSync(callDir);
  const roots = [...new Set(protectedRoots.filter(existsSync).map(p => realpathSync(p)))];
  if (!roots.some(root => own.startsWith(root + '/'))) throw new Error('调查调用不在受保护的数据目录中');
  const rules = roots.map(root => `(deny file-read-data file-write* (require-all (subpath ${JSON.stringify(root)}) (require-not (subpath ${JSON.stringify(own)}))))`);
  const profile = join(resolve(callDir), 'isolation.sb');
  writeFileSync(profile, ['(version 1)', '(allow default)', ...rules].join('\n'), { mode: 0o600 });
  return { command: '/usr/bin/sandbox-exec', args: ['-f', profile, executable, ...args], profile };
}
