import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { readdirSync, writeFileSync } from 'node:fs';
import { startService } from '../service/server.js';
const here = dirname(fileURLToPath(import.meta.url));
// Finder-launched apps do not inherit the user's interactive shell PATH.
let nvm = [];
try { nvm = readdirSync(join(homedir(), '.nvm/versions/node')).sort((a,b) => b.localeCompare(a, undefined, { numeric: true })).map(v => join(homedir(), '.nvm/versions/node', v, 'bin')); } catch {}
process.env.PATH = [join(homedir(), '.local/bin'), '/opt/homebrew/bin', '/usr/local/bin', ...nvm, process.env.PATH || '/usr/bin:/bin'].join(':');
let service, window, quitting = false;
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else app.whenReady().then(async () => {
  service = await startService({ dataDir: process.env.ROUNDTABLE_DATA_DIR || (app.isPackaged ? join(app.getPath('userData'), 'data') : resolve(here, '../../.roundtable')) });
  function trusted(event) { if (event.senderFrame?.url !== service.url + '/') throw new Error('拒绝未知窗口请求'); }
  ipcMain.handle('roundtable:bootstrap', event => { trusted(event); return { url: service.url, token: service.token }; });
  ipcMain.handle('roundtable:export', async (event, id) => {
    trusted(event); if (typeof id !== 'string') throw new Error('无效会议编号');
    const exported = service.meetings.export(id);
    const selection = await dialog.showSaveDialog(window, { title: '导出会议', defaultPath: `圆桌会议-${id}.json`, filters: [{ name: '会议记录', extensions: ['json'] }] });
    if (selection.canceled) return false;
    writeFileSync(selection.filePath, JSON.stringify(exported, null, 2)); return true;
  });
  function createWindow() {
    window = new BrowserWindow({ width: 1280, height: 860, minWidth: 860, minHeight: 600, title: '圆桌会议 · Roundtable', backgroundColor: '#f5f5f0',
      webPreferences: { preload: join(here, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
    window.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    window.webContents.on('will-navigate', (event, url) => { if (url !== service.url + '/') { event.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); } });
    window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    window.loadURL(service.url + '/');
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: '圆桌会议', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { type: 'separator' }, { role: 'quit' }] },
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '窗口', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }] },
  ]));
  createWindow();
  app.on('second-instance', () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', event => {
    if (quitting) return; event.preventDefault(); quitting = true;
    service.close().finally(() => app.quit());
  });
}).catch(error => { console.error(error); app.quit(); });
