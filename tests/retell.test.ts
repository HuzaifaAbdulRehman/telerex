import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment } from '../server/retell.ts';
import type { ExperimentEvent, InferenceRequest, ModelIdentity, ModelSettings } from '../shared/types.ts';

const settings: ModelSettings = {model:'gemma3:1b',temperature:0,seed:42,num_ctx:2048,num_predict:256,targetWords:70};
const model: ModelIdentity = {name:'gemma3:1b',digest:'unit-test-only',sizeBytes:1,parameterSize:'1B',quantization:'Q4_K_M',family:'gemma3',runtimeVersion:'test'};
const original = 'Mariam kept a blue tin beside the door.';
const outputs = ['Mariam keeps the tin.','Mariam remembers the tin.','A tin remains.','The blue tin remains.','Only the tin.','Mariam keeps her blue tin.'];
async function collect(iterator: AsyncGenerator<ExperimentEvent>) {
  const events: ExperimentEvent[] = [];
  for await (const event of iterator) events.push(event);
  return events;
}
test('runs both three-round paths using their intended source inputs', async () => {
  const requests: InferenceRequest[] = [];
  const events = await collect(runExperiment({story:original,phrases:['Mariam','blue tin']}, {
    settings,model,signal:new AbortController().signal,
    infer:async request => {
      requests.push(structuredClone(request));
      return {text:outputs[requests.length-1],latencyMs:12,totalDurationMs:10,loadDurationMs:1,promptTokens:20,outputTokens:8,doneReason:'stop'};
    }
  }));
  assert.deepEqual(requests.map(request=>request.input),
    [original,original,'Mariam keeps the tin.',original,'A tin remains.',original]);
  assert.equal(events.filter(event=>event.type==='stage').length, 6);
  const last = events.at(-1);
  assert.equal(last?.type,'complete');
  if (last?.type !== 'complete') return;
  assert.equal(last.result.original,original);
  assert.equal(last.result.status,'complete');
  assert.deepEqual(last.result.stages.map(stage=>[stage.path,stage.round]),
    [['chain',1],['source',1],['chain',2],['source',2],['chain',3],['source',3]]);
  assert.equal(last.result.stages[4].phraseMatches[0].present,false);
  assert.equal(last.result.stages[5].phraseMatches[1].present,true);
  assert.equal(last.result.stages[5].words,5);
  for (const request of requests) {
    assert.deepEqual(request.settings,settings);
    assert.equal(request.messages[0].role,'system');
    assert.match(request.messages[0].content,/70/);
    assert.equal(JSON.parse(request.messages[1].content).memory,request.input);
  }
  assert.notEqual(last.result.completedAt,null);
  assert.ok(last.result.elapsedMs >= 0);
});
test('cancellation stops subsequent model calls', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(async () => {
    for await (const event of runExperiment({story:original,phrases:[]}, {
      settings,model,signal:controller.signal,
      infer:async()=>{ calls++; return {text:'A tin.',latencyMs:1,totalDurationMs:null,loadDurationMs:null,promptTokens:null,outputTokens:null,doneReason:'stop'}; }
    })) if (event.type === 'stage') controller.abort();
  }, {code:'CANCELLED'});
  assert.equal(calls,1);
});
test('retains and labels model output that ends at the token budget', async () => {
  const events = await collect(runExperiment({story:original,phrases:[]}, {
    settings,model,signal:new AbortController().signal,
    infer:async()=>({text:'An unfinished sentence',latencyMs:1,totalDurationMs:null,loadDurationMs:null,promptTokens:null,outputTokens:null,doneReason:'length'})
  }));
  const stage = events.find(event=>event.type==='stage');
  assert.equal(stage?.type,'stage');
  if (stage?.type === 'stage') {
    assert.equal(stage.stage.text,'An unfinished sentence');
    assert.equal(stage.stage.outputLimitReached,true);
  }
});
