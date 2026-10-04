import { resolve } from 'node:path';
import { startService } from './server.js';
const service = await startService({ dataDir: resolve(process.env.ROUNDTABLE_DATA_DIR || '.roundtable'), port: Number(process.env.ROUNDTABLE_PORT || 0) });
console.log(`本地会议界面：${service.url}/#token=${service.token}`);
console.log('只监听本机；启动服务不会自动调用模型。');
let stopping = false;
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => { if (stopping) return; stopping = true; await service.close(); process.exit(0); });
