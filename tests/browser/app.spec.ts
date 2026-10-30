import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { samples } from '../../fixtures/memories.ts';
import type { ExperimentResult } from '../../shared/types.ts';

const original=samples[0].story;
const settings={model:'gemma3:1b',temperature:0,seed:42,num_ctx:2048,num_predict:256,targetWords:70};
const identity={name:'gemma3:1b',digest:'browser-contract-fixture',sizeBytes:1,parameterSize:'1B',quantization:'Q4_K_M',family:'gemma3',runtimeVersion:'browser-fixture'};
function fixtureResult():ExperimentResult {
 const texts=['Mariam kept buttons in a blue tin.','Mariam gave the blue tin to the younger sister.','A blue tin held buttons.','Mariam kept the dented tin.','Only a tin remained.','Mariam gave a dented tin to the younger sister.'];
 return {schemaVersion:1,id:'browser-fixture',createdAt:'2026-10-30T17:00:00Z',completedAt:'2026-10-30T17:01:00Z',status:'complete',original,phrases:samples[0].phrases,model:identity,settings,elapsedMs:60000,
 stages:texts.map((text,index)=>({path:index%2===0?'chain':'source',round:(Math.floor(index/2)+1) as 1|2|3,input:index<2||index%2?original:texts[index-2],text,messages:[{role:'system',content:'Fixture instruction'},{role:'user',content:JSON.stringify({memory:original})}],latencyMs:1000,totalDurationMs:900,loadDurationMs:0,promptTokens:10,outputTokens:10,doneReason:'stop',words:text.split(' ').length,phraseMatches:samples[0].phrases.map(phrase=>({phrase,present:text.toLowerCase().includes(phrase.toLowerCase()),occurrences:text.toLowerCase().includes(phrase.toLowerCase())?1:0})),outputLimitReached:false}))};
}
test.beforeEach(async({page})=>{
 await page.route('**/api/health',route=>route.fulfill({json:{ready:true,model:identity,settings}}));
});
test('offers three memories, explains both paths and accepts a custom original',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'What survives a retelling?'})).toBeVisible();
 for(const sample of samples)await expect(page.getByRole('button',{name:sample.title,exact:true})).toBeVisible();
 await expect(page.getByText('Passed onward',{exact:true})).toBeVisible();
 await expect(page.getByText('Held to the original',{exact:true})).toBeVisible();
 await page.getByLabel('Original memory',{exact:true}).fill('A fictional memory about a brass bell.');
 await expect(page.getByLabel('Original memory',{exact:true})).toHaveValue('A fictional memory about a brass bell.');
 await page.getByLabel('Phrase to follow').fill('brass bell');
 await page.getByLabel('Phrase to follow').press('Enter');
 await expect(page.getByRole('button',{name:'Remove phrase brass bell'})).toBeVisible();
 await expect(page.getByText('Phrase matches are not a truth score.',{exact:true})).toBeVisible();
});
test('shows a useful missing-model state',async({page})=>{
 await page.route('**/api/health',route=>route.fulfill({json:{ready:false,code:'MODEL_MISSING',message:'The selected model is not downloaded.',settings}}));
 await page.goto('/');
 await expect(page.getByText('The selected model is not downloaded.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Check local model'})).toBeVisible();
});
test('displays all six tellings and exports their original, inputs, settings and results',async({page})=>{
 const result=fixtureResult();
 const initial={...result,completedAt:null,status:'running',stages:[],elapsedMs:0};
 const body=[{type:'start',result:initial},...result.stages.map(stage=>({type:'stage',stage})),{type:'complete',result}].map(value=>JSON.stringify(value)).join('\n')+'\n';
 await page.route('**/api/experiment',route=>route.fulfill({contentType:'application/x-ndjson',body}));
 await page.goto('/');await page.getByRole('button',{name:'Start the tellings'}).click();
 await expect(page.getByRole('article',{name:'Passed onward, telling 3'})).toContainText('Only a tin remained.');
 await expect(page.getByRole('article',{name:'Held to the original, telling 3'})).toContainText('younger sister');
 await expect(page.getByLabel('Original memory',{exact:true})).toHaveValue(original);
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON'}).click();
 const download=await downloaded;const saved=JSON.parse(await readFile((await download.path())!,'utf8'));
 expect(saved.original).toBe(original);expect(saved.status).toBe('complete');expect(saved.stages).toHaveLength(6);
 expect(saved.settings.seed).toBe(42);expect(saved.stages[4].input).toBe('A blue tin held buttons.');
 expect(saved.model.digest).toBe('browser-contract-fixture');
});
test('validates an empty original and absent watched phrases before generation',async({page})=>{
 let calls=0;await page.route('**/api/experiment',route=>{calls++;return route.fulfill({status:500});});
 await page.goto('/');await page.getByLabel('Original memory',{exact:true}).fill(' ');
 await page.getByRole('button',{name:'Start the tellings'}).click();
 await expect(page.getByRole('alert')).toContainText('Add a memory');
 await page.getByLabel('Original memory',{exact:true}).fill('A bell rang.');
 await page.getByLabel('Phrase to follow').fill('missing');
 await page.getByRole('button',{name:'Follow phrase',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('original memory');
 expect(calls).toBe(0);
});
test('cancellation stops the waiting UI without inventing results',async({page})=>{
 await page.route('**/api/experiment',async route=>{await new Promise(resolve=>setTimeout(resolve,1500));await route.fulfill({contentType:'application/x-ndjson',body:''}).catch(()=>{});});
 await page.goto('/');await page.getByRole('button',{name:'Start the tellings'}).click();
 await page.getByRole('button',{name:'Cancel experiment'}).click();
 await expect(page.getByRole('status')).toContainText('Cancelled');
 await expect(page.getByRole('button',{name:'Start the tellings'})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Export JSON'})).toBeDisabled();
});
test('reports a truncated stream and keeps partial results exportable',async({page})=>{
 const result=fixtureResult();const initial={...result,status:'running',completedAt:null,stages:[],elapsedMs:0};
 await page.route('**/api/experiment',route=>route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'start',result:initial})+'\n'+JSON.stringify({type:'stage',stage:result.stages[0]})+'\n'}));
 await page.goto('/');await page.getByRole('button',{name:'Start the tellings'}).click();
 await expect(page.getByRole('alert')).toContainText('before the experiment completed');
 await expect(page.getByRole('button',{name:'Export JSON'})).toBeEnabled();
});
test('fits a narrow viewport with reduced motion',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await expect(page.getByRole('heading',{name:'What survives a retelling?'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
