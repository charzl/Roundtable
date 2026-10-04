# Reads only MCP sections; outputs to the parent process, never to a checked-in file.
import json, os, pathlib, tomllib
home = pathlib.Path.home()
paths = [
    ('codex', pathlib.Path(os.environ.get('CODEX_HOME', str(home/'.codex')))/'config.toml'),
    ('claude', home/'.claude.json'),
    ('claude', home/'.claude/settings.json'),
    ('claude', home/'.claude/settings.local.json'),
    ('agy', home/'.gemini/config/mcp_config.json'),
    ('cursor', home/'.cursor/mcp.json'),
    ('cursor', home/'Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp.json'),
    ('cursor', pathlib.Path('.cursor/mcp.json')),
]
sources = []
for runtime, path in paths:
    if not path.exists(): continue
    data = tomllib.loads(path.read_text()) if path.suffix == '.toml' else json.loads(path.read_text())
    servers = data.get('mcp_servers', data.get('mcpServers', {}))
    if servers: sources.append({'runtime':runtime,'path':str(path),'servers':servers})
    # Record project-scoped definitions from the user's Claude registry, without opening/changing other projects.
    if runtime == 'claude':
        for project, settings in data.get('projects', {}).items():
            if settings.get('mcpServers'): sources.append({'runtime':runtime,'path':str(path)+'#project='+project,'servers':settings['mcpServers']})
print(json.dumps(sources))
