import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { memories } from '../fixtures/memories.ts';
import { loadConfig } from '../server/config.ts';
import { getModelInfo, generate } from '../server/ollama.ts';
import { runExperiment } from '../server/retell.ts';
import type { ExperimentResult } from '../shared/types.ts';

const config = loadConfig();
const model = await getModelInfo(config);
const settings = {model:model.name,temperature:0,seed:42,num_ctx:2048,num_predict:256,targetWords:70};
const directory = resolve('docs/evaluation/runs');
await mkdir(directory,{recursive:true});
const selected = process.argv.slice(2);
const cases = selected.length ? memories.filter(memory=>selected.includes(memory.id)) : memories;
if (!cases.length) throw new Error('No evaluation case matches the supplied ids.');
const commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const controller = new AbortController();
process.once('SIGINT',()=>controller.abort());
for (const memory of cases) {
  const destination = resolve(directory,memory.id+'.json');
  try {
    const previous = JSON.parse(await readFile(destination,'utf8'));
    if (previous.result?.status === 'complete' && previous.result.original === memory.story &&
      previous.result.model.digest === model.digest && JSON.stringify(previous.result.settings) === JSON.stringify(settings)) {
      console.log(memory.id+': preserving existing completed run'); continue;
    }
    throw new Error('An existing run has different inputs or is incomplete: '+destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  console.log(memory.id+': starting real local '+model.name);
  let result: ExperimentResult | undefined;
  for await (const event of runExperiment({story:memory.story,phrases:memory.phrases},{
    model,settings,signal:controller.signal,infer:(request,signal)=>generate(config,request,signal)
  })) {
    if (event.type === 'stage') console.log(memory.id+' '+event.stage.path+' '+event.stage.round+': '+Math.round(event.stage.latencyMs)+' ms, '+event.stage.words+' words');
    if (event.type === 'complete') result = event.result;
  }
  if (!result) throw new Error('Evaluation did not finish: '+memory.id);
  await writeFile(destination,JSON.stringify({
    caseId:memory.id,title:memory.title,kind:'real local inference; fictional source',
    engineCommit:commit,prewrittenFacts:memory.facts,result
  },null,2)+'\n');
}
console.log('Completed evaluation files are under docs/evaluation/runs/. Factual review is a separate manual step.');
