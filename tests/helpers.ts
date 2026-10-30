import { createServer } from 'node:http';
import type { Server } from 'node:http';
export async function listen(server: Server): Promise<{url:string;close:()=>Promise<void>}> {
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
  const address=server.address();
  if(!address || typeof address === 'string') throw new Error('Expected a TCP listener.');
  return {url:'http://127.0.0.1:'+address.port, close:()=>new Promise<void>((resolve,reject)=>{
    server.close(error=>error?reject(error):resolve()); server.closeAllConnections();
  })};
}
export function fakeOllama() {
  const bodies: Record<string,unknown>[]=[];
  const state={mode:'ok',calls:0,aborted:0};
  const server=createServer(async(req,res)=>{
    if(req.url==='/api/version'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:'test-runtime'}));return;}
    if(req.url==='/api/tags'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({models:state.mode==='missing'?[]:[{name:'gemma3:1b',model:'gemma3:1b',digest:'sha256:test-only',size:806058400,details:{format:'gguf',family:'gemma3',parameter_size:'1B',quantization_level:'Q4_K_M'}}]}));return;}
    if(req.url!=='/api/chat'){res.writeHead(404);res.end();return;}
    const chunks:Buffer[]=[];
    for await(const chunk of req)chunks.push(chunk);
    const body=JSON.parse(Buffer.concat(chunks).toString()) as Record<string,unknown>;
    bodies.push(body);state.calls++;
    res.on('close',()=>{if(!res.writableEnded)state.aborted++;});
    if(state.mode==='slow')return;
    res.setHeader('Content-Type','application/json');
    if(state.mode==='bad-json'){res.end('not json');return;}
    if(state.mode==='oversized'){res.end('x'.repeat(70000));return;}
    if(state.mode==='error'){res.writeHead(500);res.end(JSON.stringify({error:'private upstream details'}));return;}
    const text=state.mode==='empty'?'':state.mode==='long'?'x'.repeat(4001):'Mariam keeps a blue tin beside the door.';
    res.end(JSON.stringify({model:'gemma3:1b',message:{role:'assistant',content:text},done:state.mode!=='incomplete',done_reason:state.mode==='length'?'length':'stop',total_duration:10000000,load_duration:1000000,prompt_eval_count:24,eval_count:12,eval_duration:4000000}));
  });
  return {server,state,bodies};
}
