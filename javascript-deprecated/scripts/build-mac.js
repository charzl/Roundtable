import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { migrateLegacyData } from '../src/shared/storage.js';
import electronPath from 'electron';
if(process.platform!=='darwin')throw new Error('此打包脚本需在 macOS 执行');
const target=resolve('dist/Roundtable.app'),source=resolve(electronPath,'../../..');
if(!existsSync(join(source,'Contents/Info.plist')))throw new Error('未找到 Electron.app');
// Preserve any records written inside the old alpha bundle before replacing it.
migrateLegacyData(join(homedir(), 'Library/Application Support/Roundtable/data'), [join(target, 'Contents/Resources/app/.roundtable'), resolve('.roundtable'), join(homedir(), 'Library/Application Support/roundtable-desktop/data')]);
rmSync(target,{recursive:true,force:true});cpSync(source,target,{recursive:true,verbatimSymlinks:true});
const resources=join(target,'Contents/Resources'),appDir=join(resources,'app');mkdirSync(appDir,{recursive:true});
for(const file of ['src','ui','shared','LICENSE','NOTICE','third_party'])cpSync(resolve(file),join(appDir,file),{recursive:true});
const pkg=JSON.parse(readFileSync('package.json','utf8'));delete pkg.devDependencies;delete pkg.build;writeFileSync(join(appDir,'package.json'),JSON.stringify(pkg,null,2));
for(const name of ['LICENSE','LICENSES.chromium.html']){const file=resolve(electronPath,'../../../../',name);if(existsSync(file))cpSync(file,join(resources,'electron-'+name));}
renameSync(join(target,'Contents/MacOS/Electron'),join(target,'Contents/MacOS/Roundtable'));
const plist=join(target,'Contents/Info.plist');
for(const [key,value] of Object.entries({CFBundleExecutable:'Roundtable',CFBundleName:'Roundtable',CFBundleDisplayName:'Roundtable',CFBundleIdentifier:'local.roundtable.desktop',CFBundleShortVersionString:pkg.version,CFBundleVersion:pkg.version})){
 const r=spawnSync('/usr/libexec/PlistBuddy',['-c',`Set :${key} ${value}`,plist],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);
}
const signed=spawnSync('/usr/bin/codesign',['--force','--deep','--sign','-','--preserve-metadata=entitlements,flags',target],{encoding:'utf8'});if(signed.status!==0)throw new Error(signed.stderr);
console.log(`本地开发应用已打包：${target}\n使用 ad-hoc 签名；没有 Developer ID 签名、公证、发布或部署。`);
