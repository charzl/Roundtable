import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateLegacyData } from '../src/shared/storage.js';
test('upgrade copies records and artifacts, retains source, and keeps conflicting versions', () => {
 const root=mkdtempSync(join(tmpdir(),'roundtable-storage-'));
 try {
  const source=join(root,'old-bundle'),target=join(root,'stable');
  mkdirSync(join(source,'meetings','test-fixture','calls','fixture'),{recursive:true});
  writeFileSync(join(source,'meetings','test-fixture','meeting.json'),JSON.stringify({id:'test-fixture',origin:'fixture',messages:[{text:'FIXTURE'}]}));
  writeFileSync(join(source,'meetings','test-fixture','calls','fixture','raw.jsonl'),'FIXTURE original artifact');
  assert.equal(migrateLegacyData(target,[source]).migrated.length,1);
  assert.equal(readFileSync(join(target,'meetings','test-fixture','calls','fixture','raw.jsonl'),'utf8'),'FIXTURE original artifact');
  assert.equal(existsSync(join(source,'meetings','test-fixture','meeting.json')),true);
  assert.equal(migrateLegacyData(target,[source]).migrated.length,0);
  const retained=readFileSync(join(target,'meetings','test-fixture','meeting.json'),'utf8');
  writeFileSync(join(source,'meetings','test-fixture','meeting.json'),JSON.stringify({id:'test-fixture',origin:'fixture',messages:[]}));
  const conflict=migrateLegacyData(target,[source]).conflicts[0];
  assert.equal(readFileSync(join(target,'meetings','test-fixture','meeting.json'),'utf8'),retained);
  assert.equal(JSON.parse(readFileSync(join(conflict.backup,'meeting.json'))).messages.length,0);
 } finally {rmSync(root,{recursive:true,force:true});}
});
