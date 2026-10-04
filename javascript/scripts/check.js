import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]); }
for(const file of ['src','ui','scripts','tests'].flatMap(files).filter(f=>/\.(js|cjs)$/.test(f))) {
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}
}
console.log('JavaScript syntax checks passed.');
