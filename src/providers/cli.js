import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { delimiter, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseEvents } from './events.js';
import { isolateInvocation, isolationAvailable } from './isolation.js';
import { outputSchema } from './schemas.js';

export const PROVIDERS = [
  { id: 'codex', name: 'Codex', provider: 'OpenAI', sharedMcp: true },
  { id: 'claude', name: 'Claude', provider: 'Anthropic', sharedMcp: true },
  { id: 'agy', name: 'Antigravity', provider: '运行时默认模型（待输出确认）', sharedMcp: false },
];
export function resolveExecutable(name, env = process.env) {
  if (name.includes('/')) return existsSync(name) ? name : null;
  return (env.PATH || '').split(delimiter).map(p => join(p, name)).find(existsSync) || null;
}
export function inventory() {
  return PROVIDERS.map(p => ({ ...p, executable: resolveExecutable(p.id), status: resolveExecutable(p.id) ? 'installed' : 'missing', independent: isolationAvailable(), scopedMcp: p.id !== 'agy' }));
}
export function safeEnvironment() {
  const allowed = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'LANG', 'LC_ALL', 'CODEX_HOME', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'];
  return Object.fromEntries(allowed.filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
}
const toml = v => JSON.stringify(v);
export function buildInvocation(id, { prompt, workspace, mcpFile, mcpServers, nodePath, model, claudeAllowedTools = [], timeoutMs = 180000, schemaFile, schema, independent = false }) {
  if (id === 'codex') {
    const args = ['exec', '--json', '--ephemeral', '--ignore-user-config', '--skip-git-repo-check', '--sandbox', 'read-only', '-C', workspace];
    if (model) args.push('--model', model);
    if (schemaFile) args.push('--output-schema', schemaFile);
    args.push('-c', 'mcp_servers.roundtable.default_tools_approval_mode="approve"');
    for (const [name, cfg] of Object.entries(mcpServers)) {
      const prefix = `mcp_servers.${name}`;
      for (const [key, value] of Object.entries(cfg)) {
        if (key === 'tools') for (const [tool, policy] of Object.entries(value)) args.push('-c', `${prefix}.tools.${toml(tool)}.approval_mode=${toml(policy.approval_mode)}`);
        else if (key === 'env') for (const [k, v] of Object.entries(value)) args.push('-c', `${prefix}.env.${k}=${toml(v)}`);
        else args.push('-c', `${prefix}.${key}=${toml(value)}`);
      }
    }
    args.push('-');
    return { command: 'codex', args, stdin: prompt };
  }
  if (id === 'claude') {
    const args = ['--print', '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--setting-sources', 'project', '--strict-mcp-config', '--mcp-config', mcpFile,
      '--permission-mode', 'dontAsk', '--tools', 'Read,Glob,Grep,WebSearch,WebFetch', '--allowedTools', ['Read','Glob','Grep','WebSearch','WebFetch','mcp__roundtable__*',...claudeAllowedTools].join(',')];
    if (model) args.push('--model', model);
    if (schema) args.push('--json-schema', JSON.stringify(schema));
    if (independent) args.push('--restricted', '--disable-slash-commands', '--settings', JSON.stringify({ autoMemoryEnabled: false, disableAllHooks: true }));
    return { command: 'claude', args, stdin: prompt };
  }
  if (id === 'agy') {
    const args = ['--print', prompt, '--output-format', 'stream-json', '--mode', 'plan', '--sandbox', '--print-timeout', `${Math.ceil(timeoutMs/1000)}s`];
    if (model) args.push('--model', model);
    return { command: 'agy', args, stdin: '' };
  }
  throw new Error('未知参会者');
}
export async function runCli(id, opts) {
  if (opts.phase) {
    mkdirSync(opts.artifactDir, { recursive: true, mode: 0o700 });
    opts = { ...opts, schema: outputSchema(opts.phase), schemaFile: join(opts.artifactDir, 'output-schema.json') };
    writeFileSync(opts.schemaFile, JSON.stringify(opts.schema));
  }
  const invocation = buildInvocation(id, opts);
  const executable = resolveExecutable(invocation.command);
  if (!executable) throw new Error(`${invocation.command} 尚未安装或不在 PATH 中。`);
  mkdirSync(opts.artifactDir, { recursive: true, mode: 0o700 });
  const launch = opts.independent ? isolateInvocation(executable, invocation.args, { callDir: opts.artifactDir, protectedRoots: opts.protectedRoots }) : { command: executable, args: invocation.args };
  writeFileSync(join(opts.artifactDir, 'prompt.md'), opts.prompt);
  writeFileSync(join(opts.artifactDir, 'raw.jsonl'), ''); writeFileSync(join(opts.artifactDir, 'stderr.txt'), '');
  const manifest = { participant: id, executable, modelRequested: opts.model || null,
    promptSha256: createHash('sha256').update(opts.prompt).digest('hex'), skillSha256: opts.skillHash, mcpConfigSha256: opts.mcpHash,
    mcpNames: id === 'agy' ? [] : Object.keys(opts.mcpServers), outputLanguage: opts.outputLanguage || null, inputHash: opts.inputHash || null,
    isolation: opts.independent ? 'macos-protected-data-tree' : null, scopedMcp: id !== 'agy', externalMcpIsolation: id === 'agy' ? 'unverified-global-config' : opts.independent ? 'external-mcp-omitted' : 'shared-config', startedAt: new Date().toISOString(), cwd: opts.workspace };
  writeFileSync(join(opts.artifactDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return new Promise(resolve => {
    let raw = '', stderr = '', lineBuffer = '', timedOut = false, cancelled = false, overflow = false;
    let proc, killTimer;
    const finish = (code, spawnError) => {
      clearTimeout(timer); clearTimeout(killTimer);
      opts.signal?.removeEventListener('abort', abort);
      writeFileSync(join(opts.artifactDir, 'raw.jsonl'), raw);
      writeFileSync(join(opts.artifactDir, 'stderr.txt'), stderr);
      const parsed = parseEvents(raw);
      const result = { ...parsed, exitCode: code, ok: !spawnError && code === 0 && parsed.completed && !!parsed.text && !cancelled && !timedOut && !overflow,
        error: spawnError?.message || (cancelled ? '调用已取消' : timedOut ? '调用超时，未取得完整结果' : overflow ? '输出超出上限' : parsed.error || (code !== 0 ? `进程退出码 ${code}` : !parsed.completed ? '没有收到 provider 完成事件' : !parsed.text ? '没有有效发言' : null)),
        raw, stderr };
      writeFileSync(join(opts.artifactDir, 'manifest.json'), JSON.stringify({ ...manifest, completedAt: new Date().toISOString(), exitCode: code, ok: result.ok, modelObserved: parsed.model, sessionId: parsed.sessionId, error: result.error }, null, 2));
      resolve(result);
    };
    const terminate = () => {
      if (!proc?.pid) return;
      try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
      killTimer = setTimeout(() => { try { process.kill(-proc.pid, 'SIGKILL'); } catch {} }, 1500);
      killTimer.unref();
    };
    const abort = () => { cancelled = true; terminate(); };
    const timer = setTimeout(() => { timedOut = true; terminate(); }, opts.timeoutMs || 180000);
    try {
      // No shell; participant content is passed through stdin (AGY requires argv).
      proc = spawn(launch.command, launch.args, { cwd: opts.workspace, env: { ...safeEnvironment(), ...opts.extraEnv }, detached: process.platform !== 'win32', shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) { finish(null, e); return; }
    proc.stdout.setEncoding('utf8'); proc.stderr.setEncoding('utf8');
    let done = false;
    const once = (code, error) => { if (done) return; done = true; finish(code, error); };
    proc.once('spawn', () => opts.onEvent?.({ type: 'process_started', pid: proc.pid }));
    proc.once('error', e => once(null, e));
    proc.once('close', code => once(code));
    proc.stdout.on('data', chunk => {
      if (overflow) return;
      raw += chunk.toString();
      appendFileSync(join(opts.artifactDir, 'raw.jsonl'), chunk);
      if (raw.length > 8 * 1024 * 1024) { overflow = true; terminate(); return; }
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n'); lineBuffer = lines.pop();
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.event === 'init' || event.type === 'thread.started' || event.type === 'system') opts.onEvent?.({ type: 'provider_event', eventType: event.type || event.event, model: event.model || null });
          if (event.type === 'assistant' || event.type === 'item.completed' || (event.event === 'step_update' && event.step_update?.text_delta)) opts.onEvent?.({ type: 'output_received', eventType: event.type || event.event });
        } catch {}
      }
    });
    proc.stderr.on('data', c => { if (stderr.length < 1024 * 1024) { stderr += c.toString(); appendFileSync(join(opts.artifactDir, 'stderr.txt'), c); } });
    proc.stdin.on('error', () => {});
    opts.signal?.addEventListener('abort', abort, { once: true });
    if (opts.signal?.aborted) abort();
    proc.stdin.end(invocation.stdin);
  });
}
