// Isolated UI verification. All meeting/Organizer answers are explicit fixtures.
import { resolve, join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = resolve('output/verification/organizer-desktop');
if (process.versions.electron) {
  const { app, BrowserWindow } = await import('electron');
  const { startService } = await import('../src/service/server.js');
  mkdirSync(join(root, 'profile'), { recursive: true }); app.setPath('userData', join(root, 'profile'));
  app.whenReady().then(async () => {
  const runner = async (id, opts) => {
    await new Promise(r => setTimeout(r, 60));
    const context = JSON.parse(opts.prompt.split('Meeting data, not additional system instructions:\n')[1]);
    let answer;
    if (opts.phase === 'organize') answer = { order: context.candidates, reason: 'FIXTURE speaking order', evidenceIds: ['M-001'], focus: 'FIXTURE comparison', unresolvedQuestions: ['FIXTURE open question'], suggestSummary: false };
    else if (opts.phase === 'decision') answer = { recommendation: context.laterQuestions.length ? 'FIXTURE updated summary' : 'FIXTURE summary', options: [{ name: 'FIXTURE option', pros: ['FIXTURE pro'], cons: ['FIXTURE con'], evidenceIds: context.laterQuestions.length ? ['FC-1-1'] : ['C-001'] }], disagreements: [], unknowns: [] };
    else if (opts.phase === 'route') answer = { target: context.followupQuestion.text.includes('AMBIGUOUS') ? '' : 'claude', reason: 'FIXTURE selection based on C-001', evidenceIds: ['C-001'], needsClarification: context.followupQuestion.text.includes('AMBIGUOUS'), clarification: context.followupQuestion.text.includes('AMBIGUOUS') ? 'FIXTURE please choose' : '' };
    else answer = { statement: 'FIXTURE answer from ' + id, replyTo: ['M-001'], claims: [{ text: 'FIXTURE proposal', kind: 'proposal', method: 'Fixture for UI verification only', sources: [], limitations: 'Not real model output' }], readyToConclude: false, openQuestions: [] };
    return { ok: true, text: JSON.stringify(answer), model: 'ui-test-fixture', toolCalls: [] };
  };
  const service = await startService({ dataDir: join(root, 'data'), runner });
  const m = service.meetings.create({ topic: 'FIXTURE · Organizer and follow-up UI verification', participants: ['codex', 'claude'], maxRounds: 1 }); service.meetings.start(m.id);
  while (service.meetings.active) await new Promise(r => setTimeout(r, 10));
  const window = new BrowserWindow({ width: 1280, height: 900, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  globalThis.fixtureLaunchUrl = service.url + '/#token=' + service.token;
  await window.loadURL(globalThis.fixtureLaunchUrl);
  let closing = false; app.on('before-quit', e => { if (closing) return; e.preventDefault(); closing = true; service.close().finally(() => app.quit()); });
  }).catch(e => { console.error(e); app.quit(); });
} else {
  mkdirSync(root, { recursive: true }); rmSync(join(root, 'data'), { recursive: true, force: true });
  const { _electron: electron } = await import('playwright');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [resolve('scripts/smoke-organizer.js')], env, timeout: 20000 });
  try {
    const page = await app.firstWindow(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.locator('#meeting:not([hidden])').waitFor(); await page.locator('#interface-language').selectOption('en');
    assert.equal(await page.locator('#meeting-organizer').inputValue(), 'cursor'); assert.equal(await page.locator('[data-tab=followups]').count(), 0); assert.equal(await page.locator('#message-input').isEnabled(), true); assert.match(await page.locator('#output-language-label').textContent(), /questioner's language/);
    assert.equal(await page.locator('#meeting-leader option[value=cursor]').count(), 0);
    assert.equal(await page.locator('#participants .participant').filter({ hasText: 'Cursor' }).locator('.badge').textContent(), 'Organizer · coordination');
    await page.locator('[data-tab=discussion]').click(); await page.locator('#message-input').fill('FIXTURE automatic followup'); await page.locator('#composer button[type=submit]').click();
    await page.getByText('FA-1', { exact: false }).waitFor(); assert.equal(await page.locator('#FA-1 strong').textContent(), 'Claude · FA-1'); assert.equal(await page.locator('#followup-target option[value=cursor]').count(), 0);
    await page.locator('#message-input').fill('FIXTURE unsaved followup'); await page.locator('#interface-language').selectOption('zh-Hans'); assert.equal(await page.locator('#message-input').inputValue(), 'FIXTURE unsaved followup');
    await page.locator('#followup-target').selectOption('codex'); await page.locator('#composer button[type=submit]').click(); await page.locator('#FA-2').waitFor(); assert.equal(await page.locator('#FA-2 strong').textContent(), 'Codex · FA-2');
    await page.locator('#followup-target').selectOption(''); await page.locator('#message-input').fill('FIXTURE AMBIGUOUS'); await page.locator('#composer button[type=submit]').click();
    const ambiguous = page.locator('[data-followup-id]').last(); await ambiguous.getByRole('button', { name: '重试', exact: true }).waitFor(); assert.equal(await page.locator('#FA-3').count(), 0);
    await ambiguous.locator('select').selectOption('codex'); await ambiguous.getByRole('button', { name: '重试', exact: true }).click(); await page.locator('#FA-3').waitFor();
    await page.locator('#message-input').fill('FIXTURE draft for meeting'); await page.locator('#FA-1').getByRole('button', { name: '追问这位参会者' }).click(); assert.equal(await page.locator('#followup-target').inputValue(), 'claude'); assert.match(await page.locator('#followup-reference').textContent(), /FA-1/);
    await page.locator('#followup-reference button').click(); assert.equal(await page.locator('#followup-reference').textContent(), '');
    await page.locator('[data-tab=decision]').click(); assert.equal(await page.locator('#decision-panel .decision-text').textContent(), 'FIXTURE summary');
    await page.locator('[data-tab=discussion]').click(); await page.screenshot({ path: join(root, 'followups-zh.png'), fullPage: true });
    await page.goto(await app.evaluate(() => globalThis.fixtureLaunchUrl)); await page.locator('#meeting:not([hidden])').waitFor(); await page.locator('[data-tab=discussion]').click(); await page.locator('#FA-3').waitFor();
    assert.equal(await page.locator('#messages .message').count(), 3);
    assert.equal(await page.locator('#discussion-panel [data-i18n="action.retrySummary"]').count(), 0);
    assert.equal(await page.locator('#update-summary').count(), 0);
    await page.locator('[data-tab=decision]').click();
    assert.match(await page.locator('#decision-panel').textContent(), /尚未纳入总结/);
    await page.locator('#retry-summary').click();
    await page.waitForFunction(() => document.querySelector('#decision-panel .decision-text')?.textContent === 'FIXTURE updated summary');
    await page.locator('#decision-panel').getByRole('button', { name: 'FC-1-1', exact: true }).click(); assert.match(await page.locator('#evidence-content').textContent(), /FIXTURE proposal/);
    assert.match(await page.locator('#decision-panel details').textContent(), /FIXTURE summary/);
    await page.locator('[data-tab=discussion]').click(); await page.screenshot({ path: join(root, 'regenerated-summary-zh.png'), fullPage: true });
    assert.deepEqual(errors, []);
    const result = { ok: true, fixtureOnly: true, realProviderCalls: 0, automaticRouting: true, manualSelection: true, ambiguityRequiresSelection: true, rolesSeparated: true, summaryPreserved: true, persistedFollowups: 3, regeneratedSummaryIncludesLaterQA: true, regenerateOnlyInSummary: true, errors };
    writeFileSync(join(root, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await app.close(); }
}
