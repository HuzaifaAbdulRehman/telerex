import { createApp } from './http.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const server = createApp(config);
server.on('error', error => { console.error('Could not start Third Telling:', error.message); process.exitCode = 1; });
server.listen(config.port,'127.0.0.1',()=>console.log('Third Telling: http://127.0.0.1:'+config.port));
for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal,()=>server.close());
