import { test } from 'node:test';
import { request } from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/http.ts';
import { fakeOllama, listen } from './helpers.ts';
const original='Mariam keeps a blue tin beside the door.';
async function setup(t:{after:(f:()=>unknown)=>void}){
 const fake=fakeOllama();const ollama=await listen(fake.server);
 const dist=await mkdtemp(join(tmpdir(),'third-telling-test-'));
 await writeFile(join(dist,'index.html'),'<!doctype html><title>Third Telling</title>');
 const app=createApp({port:3210,ollamaUrl:ollama.url,model:'gemma3:1b',timeoutMs:2000,distDir:dist});
 const local=await listen(app);t.after(async()=>{await local.close();await ollama.close();await rm(dist,{recursive:true,force:true});});
 return {fake,url:local.url};
}
test('serves local health and real engine events through the HTTP boundary',async t=>{
 const {url}=await setup(t);
 const health=await fetch(url+'/api/health').then(r=>r.json());assert.equal(health.ready,true);assert.equal(health.model.name,'gemma3:1b');
 const r=await fetch(url+'/api/experiment',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({story:original,phrases:['Mariam']})});
 assert.equal(r.status,200);assert.match(r.headers.get('Content-Type')??'',/application\/x-ndjson/);
 const events=(await r.text()).trim().split('\n').map(line=>JSON.parse(line));
 assert.equal(events.filter(e=>e.type==='stage').length,6);
 assert.equal(events.at(-1).result.original,original);
 assert.equal(events.at(-1).result.stages.length,6);
 assert.equal(events.at(-1).result.settings.model,'gemma3:1b');
});
test('rejects invalid requests and oversized bodies before calling the model',async t=>{
 const {url,fake}=await setup(t);
 const request=(body:string)=>fetch(url+'/api/experiment',{method:'POST',headers:{'Content-Type':'application/json'},body});
 assert.equal((await request('{')).status,400);
 assert.equal((await request(JSON.stringify({story:'x'.repeat(1501)}))).status,400);
 assert.equal((await request('x'.repeat(20000))).status,413);
 assert.equal(fake.state.calls,0);
});
test('rejects cross-site browser requests and untrusted Host headers',async t=>{
 const {url,fake}=await setup(t);
 const cross=await fetch(url+'/api/experiment',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify({story:original})});
 assert.equal(cross.status,403);
 const hostStatus=await new Promise<number>((resolve,reject)=>{const req=request(url+'/api/health',{headers:{Host:'untrusted.example'}},res=>{res.resume();resolve(res.statusCode!);});req.on('error',reject);req.end();});
 assert.equal(hostStatus,403);assert.equal(fake.state.calls,0);
});
test('serves production assets with a restrictive policy',async t=>{
 const {url}=await setup(t);const r=await fetch(url);
 assert.equal(r.status,200);assert.match(await r.text(),/Third Telling/);
 assert.match(r.headers.get('Content-Security-Policy')??'',/connect-src 'self'/);
 assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('returns the missing-model state without a fabricated experiment',async t=>{
 const {url,fake}=await setup(t);fake.state.mode='missing';
 const health=await fetch(url+'/api/health').then(r=>r.json());assert.equal(health.ready,false);assert.equal(health.code,'MODEL_MISSING');
 const r=await fetch(url+'/api/experiment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story:original})});
 assert.equal(r.status,503);assert.equal((await r.json()).code,'MODEL_MISSING');assert.equal(fake.state.calls,0);
});
test('disconnecting releases the busy slot and aborts the model request',async t=>{
 const {url,fake}=await setup(t);fake.state.mode='slow';
 const controller=new AbortController();
 const r=await fetch(url+'/api/experiment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story:original}),signal:controller.signal});
 assert.equal(r.status,200);
 const reader=r.body!.getReader();await reader.read();
 const busy=await fetch(url+'/api/experiment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story:original})});assert.equal(busy.status,409);
 controller.abort();try{await reader.read();}catch{}
 await new Promise(resolve=>setTimeout(resolve,80));
 fake.state.mode='ok';
 const retry=await fetch(url+'/api/experiment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story:original})});
 assert.equal(retry.status,200);assert.match(await retry.text(),/"type":"complete"/);
 assert.ok(fake.state.aborted>=1);
});


test('accepts canonical browser Host and Origin on HTTP port 80',async t=>{
 const fake=fakeOllama();const upstream=await listen(fake.server);
 const app=createApp({port:80,ollamaUrl:upstream.url,model:'gemma3:1b',timeoutMs:2000,distDir:tmpdir()});
 const local=await listen(app);t.after(async()=>{await local.close();await upstream.close();});
 // Use an ephemeral listener while exercising the address reported for port 80.
 t.mock.method(app,'address',()=>({address:'127.0.0.1',family:'IPv4',port:80}));
 const status=(host:string,origin:string)=>new Promise<number>((resolve,reject)=>{
  const req=request(local.url+'/api/health',{headers:{Host:host,Origin:origin}},res=>{res.resume();resolve(res.statusCode!);});
  req.on('error',reject);req.end();
 });
 assert.equal(await status('127.0.0.1','http://127.0.0.1'),200);
 assert.equal(await status('localhost','http://localhost'),200);
 assert.equal(await status('[::1]','http://[::1]'),200);
 assert.equal(await status('127.0.0.1','http://untrusted.example'),403);
 assert.equal(fake.state.calls,0);
});
