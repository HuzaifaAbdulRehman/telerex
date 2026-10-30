import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getModelInfo, generate } from '../server/ollama.ts';
import { listen, fakeOllama } from './helpers.ts';
import { retellingMessages } from '../server/retell.ts';
import type { AppConfig } from '../server/config.ts';
const settings={model:'gemma3:1b',temperature:0,seed:42,num_ctx:2048,num_predict:256,targetWords:70};
const input='Mariam keeps a blue tin.';
test('records actual local model identity and inference metrics',async t=>{
 const fake=fakeOllama();const endpoint=await listen(fake.server);t.after(endpoint.close);
 const c:AppConfig={port:3210,ollamaUrl:endpoint.url,model:'gemma3:1b',timeoutMs:2000,distDir:''};
 assert.deepEqual(await getModelInfo(c),{name:'gemma3:1b',digest:'sha256:test-only',sizeBytes:806058400,parameterSize:'1B',quantization:'Q4_K_M',family:'gemma3',runtimeVersion:'test-runtime'});
 const r=await generate(c,{input,messages:retellingMessages(input,70),settings},new AbortController().signal);
 assert.equal(r.text,'Mariam keeps a blue tin beside the door.');assert.equal(r.totalDurationMs,10);assert.equal(r.outputTokens,12);
 assert.deepEqual(fake.bodies[0].options,{temperature:0,seed:42,num_ctx:2048,num_predict:256});
 assert.equal(fake.bodies[0].stream,false);
});
test('reports a missing model without attempting generation',async t=>{
 const fake=fakeOllama();fake.state.mode='missing';const endpoint=await listen(fake.server);t.after(endpoint.close);
 await assert.rejects(getModelInfo({port:3210,ollamaUrl:endpoint.url,model:'gemma3:1b',timeoutMs:2000,distDir:''}),{code:'MODEL_MISSING'});
 assert.equal(fake.state.calls,0);
});
test('rejects empty, malformed, oversized and unfinished model responses',async t=>{
 const fake=fakeOllama();const endpoint=await listen(fake.server);t.after(endpoint.close);
 const c={port:3210,ollamaUrl:endpoint.url,model:'gemma3:1b',timeoutMs:2000,distDir:''};
 for(const mode of ['empty','bad-json','oversized','long','incomplete']){
  fake.state.mode=mode;
  await assert.rejects(generate(c,{input,messages:retellingMessages(input,70),settings},new AbortController().signal),{code:'INVALID_MODEL_RESPONSE'});
 }
});
test('turns upstream errors into useful messages without returning upstream details',async t=>{
 const fake=fakeOllama();fake.state.mode='error';const endpoint=await listen(fake.server);t.after(endpoint.close);
 const c={port:3210,ollamaUrl:endpoint.url,model:'gemma3:1b',timeoutMs:2000,distDir:''};
 await assert.rejects(generate(c,{input,messages:retellingMessages(input,70),settings},new AbortController().signal),error=>{
  assert.equal((error as {code:string}).code,'MODEL_UNAVAILABLE');
  assert.doesNotMatch(String(error),/private upstream details/);return true;
 });
});
test('model timeout aborts the actual upstream HTTP request',async t=>{
 const fake=fakeOllama();fake.state.mode='slow';const endpoint=await listen(fake.server);t.after(endpoint.close);
 const c={port:3210,ollamaUrl:endpoint.url,model:'gemma3:1b',timeoutMs:80,distDir:''};
 await assert.rejects(generate(c,{input,messages:retellingMessages(input,70),settings},new AbortController().signal),{code:'MODEL_TIMEOUT'});
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(fake.state.aborted,1);
});
test('caller cancellation aborts inference rather than converting it to a timeout',async t=>{
 const fake=fakeOllama();fake.state.mode='slow';const endpoint=await listen(fake.server);t.after(endpoint.close);
 const controller=new AbortController();
 const c={port:3210,ollamaUrl:endpoint.url,model:'gemma3:1b',timeoutMs:2000,distDir:''};
 const run=generate(c,{input,messages:retellingMessages(input,70),settings},controller.signal);
 setTimeout(()=>controller.abort(),40);
 await assert.rejects(run,{code:'CANCELLED'});
});
