// Claude's configuration has no cwd field; pass stdio through a cwd-aware process.
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const child = spawn(config.command, config.args, { cwd: config.cwd, env: process.env, stdio: 'inherit', shell: false });
child.once('error', () => { process.stderr.write('MCP process launch failed\n'); process.exit(1); });
child.once('close', (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exit(code ?? 1); });
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => child.kill(signal));
