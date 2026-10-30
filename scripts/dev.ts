import { createServer as createViteServer } from 'vite';
import { createApp } from '../server/http.ts';
import { loadConfig } from '../server/config.ts';
const config={...loadConfig(),development:true};
const vite=await createViteServer({server:{middlewareMode:true,host:'127.0.0.1'},appType:'spa'});
const server=createApp(config,(request,response,next)=>vite.middlewares(request,response,next));
server.on('error',error=>{console.error('Could not start Third Telling:',error.message);process.exitCode=1;void vite.close();});
server.listen(config.port,'127.0.0.1',()=>console.log('Third Telling development: http://127.0.0.1:'+config.port));
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{server.close();void vite.close();});
