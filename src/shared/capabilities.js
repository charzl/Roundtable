import { readFileSync, readdirSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const bundled = resolve(dirname(fileURLToPath(import.meta.url)), '../../shared');
export class Capabilities {
  constructor(root, nodePath = process.execPath) {
    this.root = root; this.nodePath = nodePath;
    mkdirSync(join(root, 'skills', 'evidence-discipline'), { recursive: true, mode: 0o700 });
    for (const file of ['mcp.json', 'skills/evidence-discipline/SKILL.md']) {
      if (!existsSync(join(root, file))) copyFileSync(join(bundled, file), join(root, file));
    }
  }
  content() {
    const texts = readdirSync(join(this.root, 'skills'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => {
      const file = join(this.root, 'skills', e.name, 'SKILL.md');
      return existsSync(file) ? readFileSync(file, 'utf8') : '';
    }).filter(Boolean);
    return texts.join('\n\n');
  }
  config() { const obj = JSON.parse(readFileSync(join(this.root, 'mcp.json'), 'utf8')); validateMcp(obj); return obj; }
  info() {
    const content = this.content();
    return { directory: this.root, skillHash: createHash('sha256').update(content).digest('hex'), skillText: content, config: this.config(), mcpHash: createHash('sha256').update(JSON.stringify(this.config())).digest('hex'),
      builtIn: ['roundtable_history', 'roundtable_evidence', 'roundtable_research', 'roundtable_verify'],
      note: '配置传入与实际工具调用分别记录。AGY 尚不支持本项目的 MCP 配置适配。' };
  }
  update(config) { validateMcp(config); writeFileSync(join(this.root, 'mcp.json'), JSON.stringify(config, null, 2)); }
  prepare({ meetingDir, callDir, participant, callId, snapshot }) {
    const token = randomUUID();
    writeFileSync(join(meetingDir, 'access.json'), JSON.stringify({ token, participant, callId }), { mode: 0o600 });
    const env = { ELECTRON_RUN_AS_NODE: '1', ROUNDTABLE_MEETING_DIR: meetingDir, ROUNDTABLE_TOKEN: token, ROUNDTABLE_PARTICIPANT: participant, ROUNDTABLE_CALL_ID: callId };
    const servers = { roundtable: { command: this.nodePath, args: [resolve(dirname(fileURLToPath(import.meta.url)), 'mcp-server.js')], env } };
    for (const [name, cfg] of Object.entries(snapshot.config.mcpServers)) {
      const safe = { ...cfg }; delete safe.envRefs;
      if (cfg.envRefs) {
        safe.env = { ...safe.env };
        for (const [key, reference] of Object.entries(cfg.envRefs)) {
          if (!process.env[reference]) throw new Error(`共享 MCP ${name} 缺少环境变量 ${reference}`);
          safe.env[key] = process.env[reference];
        }
      }
      servers[name] = safe;
    }
    const extraEnv = {}, codexServers = {}, claudeServers = {};
    for (const [name, cfg] of Object.entries(servers)) {
      const codex = { ...cfg }, claude = { ...cfg };
      delete codex.allowedTools; delete claude.allowedTools;
      if (cfg.env) {
        codex.env_vars = Object.keys(cfg.env); delete codex.env;
        for (const [key, value] of Object.entries(cfg.env)) {
          if (extraEnv[key] !== undefined && extraEnv[key] !== value) throw new Error(`共享 MCP 的环境变量 ${key} 存在不同值，请使用不同变量名`);
          extraEnv[key] = value;
        }
      }
      if (cfg.bearer_token_env_var) {
        const reference = cfg.bearer_token_env_var;
        if (!process.env[reference]) throw new Error(`共享 MCP ${name} 缺少环境变量 ${reference}`);
        extraEnv[reference] = process.env[reference];
        claude.headers = { Authorization: `Bearer ${process.env[reference]}` }; delete claude.bearer_token_env_var;
      }
      if (cfg.url) claude.type = 'http';
      if (cfg.allowedTools) {
        codex.enabled_tools = cfg.allowedTools;
        codex.tools = Object.fromEntries(cfg.allowedTools.map(tool => [tool, { approval_mode: 'approve' }]));
      }
      codexServers[name] = codex; claudeServers[name] = claude;
    }
    const claudeAllowedTools = Object.entries(servers).flatMap(([name, cfg]) => (cfg.allowedTools || []).map(tool => `mcp__${name}__${tool}`));
    const mcpFile = join(callDir, 'mcp.json'); mkdirSync(callDir, { recursive: true, mode: 0o700 });
    writeFileSync(mcpFile, JSON.stringify({ mcpServers: claudeServers }), { mode: 0o600 });
    return { mcpServers: codexServers, mcpFile, nodePath: this.nodePath, skillHash: snapshot.skillHash, mcpHash: snapshot.mcpHash, extraEnv, claudeAllowedTools };
  }
  revoke(meetingDir, callDir) {
    writeFileSync(join(meetingDir, 'access.json'), '{}');
    // Keep provider logs and manifest, but never retain secret-bearing runtime config.
    writeFileSync(join(callDir, 'mcp.json'), JSON.stringify({ redacted: true }));
  }
}
export function validateMcp(config) {
  if (!config || typeof config !== 'object' || !config.mcpServers || Array.isArray(config.mcpServers)) throw new Error('需要 {"mcpServers": {...}} 配置');
  for (const [name, server] of Object.entries(config.mcpServers)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name) || name === 'roundtable') throw new Error('MCP 名称无效或与会议证据库重名');
    if (!server || typeof server !== 'object' || !(typeof server.command === 'string' || typeof server.url === 'string')) throw new Error(`${name} 需要 command 或 url`);
    const allowed = ['command', 'args', 'env', 'envRefs', 'url', 'bearer_token_env_var', 'allowedTools'];
    if (Object.keys(server).some(k => !allowed.includes(k))) throw new Error(`${name} 包含尚未支持的配置字段`);
    if (server.allowedTools && (!Array.isArray(server.allowedTools) || server.allowedTools.some(tool => typeof tool !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(tool)))) throw new Error('allowedTools 需要明确的工具名称数组');
    if (server.bearer_token_env_var && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(server.bearer_token_env_var)) throw new Error('bearer_token_env_var 需要环境变量名称');
    if (server.args && (!Array.isArray(server.args) || server.args.some(v => typeof v !== 'string'))) throw new Error('args 必须为字符串数组');
    for (const field of ['env', 'envRefs']) if (server[field] && (typeof server[field] !== 'object' || Array.isArray(server[field]) || Object.entries(server[field]).some(([k,v]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || typeof v !== 'string'))) throw new Error(`${field} 格式无效`);
    if (server.url && !/^https?:\/\//.test(server.url)) throw new Error('MCP URL 需要 http 或 https');
  }
}
