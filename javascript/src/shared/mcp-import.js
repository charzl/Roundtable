import { createHash } from 'node:crypto';
const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const slug = value => value.replace(/[^A-Za-z0-9_-]/g, '_').replace(/^[^A-Za-z]/, 'm_');
const envName = value => value.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
export function mergeMcpSources(sources, existing = { mcpServers: {} }, previousSecrets = {}) {
  const config = structuredClone(existing), secrets = { ...previousSecrets }, provenance = {}, deferred = [];
  for (const source of sources) for (const [originalName, original] of Object.entries(source.servers)) {
    const server = {};
    const url = original.url || original.serverUrl;
    if (url) server.url = url;
    else if (typeof original.command === 'string') { server.command = original.command; if (original.args) server.args = original.args; }
    else { deferred.push({ runtime: source.runtime, name: originalName, reason: 'No supported command or HTTP URL' }); continue; }
    if (original.type && !['stdio', 'http', 'streamable-http'].includes(original.type)) { deferred.push({ runtime: source.runtime, name: originalName, reason: 'Unsupported transport: ' + original.type }); continue; }
    const passthrough = ['cwd', 'env', 'envRefs', 'bearer_token_env_var', 'allowedTools', 'startup_timeout_sec', 'tool_timeout_sec'];
    for (const key of passthrough) if (original[key] !== undefined) server[key] = original[key];
    if (original.enabled === false || original.disabled === true) server.enabled = false;
    if (original.enabled_tools) server.allowedTools = original.enabled_tools.filter(t => !(original.disabled_tools || []).includes(t));
    if (original.env_vars?.length) server.envRefs = { ...server.envRefs, ...Object.fromEntries(original.env_vars.filter(v => typeof v === 'string').map(v => [v,v])) };
    if (original.headers || original.http_headers || original.env_http_headers) { deferred.push({ runtime: source.runtime, name: originalName, reason: 'Custom HTTP headers require a supported adapter' }); continue; }
    const ignored = Object.keys(original).filter(k => !['command','args','url','serverUrl','type','env','envRefs','env_vars','cwd','bearer_token_env_var','enabled','disabled','allowedTools','enabled_tools','disabled_tools','startup_timeout_sec','tool_timeout_sec'].includes(k));
    let name = slug(originalName); if (name === 'roundtable') name = source.runtime + '_roundtable';
    const signature = stable(server);
    // Compare resolved values so repeats across runtimes and repeated imports deduplicate.
    const resolved = cfg => { const clone = structuredClone(cfg); if (clone.envRefs) { for (const [k,reference] of Object.entries(clone.envRefs)) if (secrets[reference] !== undefined) { clone.env ??= {}; clone.env[k] = secrets[reference]; delete clone.envRefs[k]; } if (!Object.keys(clone.envRefs).length) delete clone.envRefs; } return stable(clone); };
    if (config.mcpServers[name] && resolved(config.mcpServers[name]) !== signature) {
      name = slug(source.runtime + '_' + originalName);
      if (config.mcpServers[name] && resolved(config.mcpServers[name]) !== signature) name += '_' + createHash('sha256').update(signature).digest('hex').slice(0, 8);
    }
    if (!config.mcpServers[name]) {
      if (server.env) { server.envRefs = { ...server.envRefs }; for (const [key,value] of Object.entries(server.env)) { const reference = 'ROUNDTABLE_MCP_' + envName(name) + '_' + envName(key) + '_' + createHash('sha256').update(name + ':' + key).digest('hex').slice(0, 8).toUpperCase(); secrets[reference] = value; server.envRefs[key] = reference; } delete server.env; }
      config.mcpServers[name] = server;
    }
    provenance[name] ??= []; provenance[name].push({ runtime: source.runtime, source: source.path, originalName, ignoredFields: ignored });
  }
  return { config, secrets, provenance, deferred };
}
