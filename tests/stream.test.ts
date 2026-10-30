import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumeExperiment } from '../src/stream.ts';
import type { ExperimentEvent } from '../shared/types.ts';
test('reads NDJSON split across chunks and a final line without a newline',async()=>{
 const chunks=['{"type":"sta','ge","stage":{}}\n{"type":"complete","result":{"status":"complete","stages":[1,2,3,4,5,6]}}'];
 const response=new Response(new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(new TextEncoder().encode(chunk));controller.close();}}));
 const events:ExperimentEvent[]=[];await consumeExperiment(response,event=>events.push(event));assert.equal(events.length,2);assert.equal(events[1].type,'complete');
});
test('rejects an unfinished response even after valid stages',async()=>{
 await assert.rejects(consumeExperiment(new Response('{"type":"stage","stage":{}}\n'),()=>{}),{code:'INCOMPLETE_STREAM'});
});
test('returns application errors instead of pretending the run completed',async()=>{
 await assert.rejects(consumeExperiment(new Response('{"type":"error","code":"MODEL_TIMEOUT","message":"Model timed out."}\n'),()=>{}),{code:'MODEL_TIMEOUT'});
 await assert.rejects(consumeExperiment(new Response('{"code":"MODEL_MISSING","message":"Download the model."}',{status:503}),()=>{}),{code:'MODEL_MISSING'});
});
test('rejects invalid JSON and oversized events',async()=>{
 await assert.rejects(consumeExperiment(new Response('{bad}\n'),()=>{}),{code:'INVALID_STREAM'});
 await assert.rejects(consumeExperiment(new Response('x'.repeat(1000001)),()=>{}),{code:'INVALID_STREAM'});
});
