import { useEffect, useRef, useState } from 'react';
import { samples } from '../fixtures/memories.ts';
import { phraseRanges, validateInput, wordCount } from '../shared/input.ts';
import { AppError } from '../shared/errors.ts';
import type { ExperimentEvent, ExperimentResult, ModelIdentity, ModelSettings, PathName, Stage } from '../shared/types.ts';
import { consumeExperiment } from './stream.ts';
import './styles.css';

interface Health { ready: boolean; model?: ModelIdentity; settings?: ModelSettings; message?: string; code?: string }
const paths: {id:PathName;title:string;explanation:string;symbol:string}[] = [
  {id:'chain',title:'Passed onward',explanation:'Each telling reads only the one before it.',symbol:'↝'},
  {id:'source',title:'Held to the original',explanation:'Each telling returns to the same source.',symbol:'↳'}
];
function seconds(ms:number) { return (ms/1000).toFixed(1)+'s'; }
function Highlighted({text,phrases}:{text:string;phrases:string[]}) {
  const ranges=phraseRanges(text,phrases);
  let offset=0;
  const parts:React.ReactNode[]=[];
  for(const range of ranges) {
    if(range.start>offset)parts.push(text.slice(offset,range.start));
    parts.push(<mark key={range.start}>{text.slice(range.start,range.end)}</mark>);
    offset=range.end;
  }
  parts.push(text.slice(offset));
  return <>{parts}</>;
}
function Telling({path,round,stage,active,phrases}:{path:typeof paths[number];round:number;stage?:Stage;active:boolean;phrases:string[]}) {
  return <article className={'telling '+(stage?'has-telling':'empty-telling')+(active?' is-current':'')} aria-label={path.title+', telling '+round}>
    <div className="telling-header"><span className="round-number">{String(round).padStart(2,'0')}</span><span>Telling {round}</span>
      {stage&&<span className="stage-time">{seconds(stage.latencyMs)} <span aria-hidden="true">·</span> {stage.words} words</span>}
    </div>
    {stage ? <>
      <p className="retelling"><Highlighted text={stage.text} phrases={phrases}/></p>
      <div className="phrase-observations" aria-label="Literal phrase observations">
        {stage.phraseMatches.length ? stage.phraseMatches.map(match=><span className={'phrase-observation '+(match.present?'present':'absent')} key={match.phrase}>
          <span aria-hidden="true">{match.present?'●':'○'}</span> {match.phrase}<span className="sr-only">{match.present?' appears':' does not appear'}</span>
        </span>) : <span className="quiet">No phrases selected.</span>}
      </div>
      {stage.outputLimitReached&&<p className="stage-warning">The model reached its token limit. This text was kept as returned.</p>}
      <details className="stage-details"><summary>See what the model read</summary><p>{stage.input}</p></details>
    </> : <div className="empty-copy"><span className="ghost-lines" aria-hidden="true"><i/><i/><i/></span><p>{active?'The next telling is taking shape…':'A telling will appear here.'}</p></div>}
  </article>;
}

export default function App() {
  const [sampleId,setSampleId]=useState<string|null>(samples[0].id);
  const [story,setStory]=useState(samples[0].story);
  const [phrases,setPhrases]=useState<string[]>([...samples[0].phrases]);
  const [phrase,setPhrase]=useState('');
  const [health,setHealth]=useState<Health|null>(null);
  const [result,setResult]=useState<ExperimentResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('Choose a memory, then follow its three tellings.');
  const controller=useRef<AbortController|null>(null);
  const runStarted=useRef(0);

  async function checkHealth(signal?:AbortSignal) {
    try {
      const response=await fetch('/api/health',{signal});
      if(!response.ok)throw new Error('Local model check failed.');
      setHealth(await response.json() as Health);
    } catch {
      if(!signal?.aborted)setHealth({ready:false,message:'Cannot check the local model. Make sure the app server is running.'});
    }
  }
  useEffect(()=>{
    const check=new AbortController();
    void checkHealth(check.signal);
    return ()=>{check.abort();controller.current?.abort();};
  },[]);

  function chooseMemory(id:string|null) {
    if(busy)return;
    if(result&&!window.confirm('Start a new memory? Export this experiment first if you want to keep it.'))return;
    const sample=samples.find(item=>item.id===id);
    setSampleId(sample?.id??null);setStory(sample?.story??'');setPhrases(sample?[...sample.phrases]:[]);
    setPhrase('');setResult(null);setError('');setNotice(sample?'A fictional memory is ready.':'Write a memory you are comfortable processing locally.');
  }
  function changeStory(value:string) {
    setStory(value);setSampleId(null);setPhrases([]);setError('');
  }
  function addPhrase() {
    try {
      const input=validateInput({story,phrases:[...phrases,phrase]});
      setPhrases(input.phrases);setPhrase('');setError('');
    } catch(e) {setError(e instanceof Error?e.message:'Choose a phrase from the original memory.');}
  }
  function receive(event:ExperimentEvent) {
    if(event.type==='start')setResult(event.result);
    else if(event.type==='stage') {
      setResult(current=>current?{...current,stages:[...current.stages,event.stage],elapsedMs:performance.now()-runStarted.current}:null);
      setNotice((event.stage.round-1)*2+(event.stage.path==='chain'?1:2)+' of 6 tellings received.');
    } else if(event.type==='complete') {
      setResult(event.result);setNotice('All six tellings are here. Read what changed; keep the original close.');
    }
  }
  async function start() {
    let input;
    try {input=validateInput({story,phrases});}
    catch(e) {setError(e instanceof Error?e.message:'Add a memory before starting.');return;}
    if(result&&!window.confirm('Run this experiment again? Export the current results first if you want to keep them.'))return;
    const abort=new AbortController();controller.current=abort;
    runStarted.current=performance.now();setBusy(true);setError('');setResult(null);
    setNotice('Starting the local model. The first telling can take a little longer.');
    try {
      const response=await fetch('/api/experiment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:abort.signal});
      await consumeExperiment(response,receive);
    } catch(e) {
      const cancelled=abort.signal.aborted;
      setResult(current=>current?{...current,status:cancelled?'cancelled':'error',completedAt:new Date().toISOString(),elapsedMs:performance.now()-runStarted.current}:null);
      if(cancelled)setNotice('Cancelled. Any completed tellings remain below.');
      else {
        setError(e instanceof AppError?e.message:'The local connection stopped. Any completed tellings remain available.');
        setNotice('The experiment stopped before it finished.');
      }
    } finally {setBusy(false);controller.current=null;}
  }
  function exportResult() {
    if(!result)return;
    const blob=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'});
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);
    link.download='third-telling-'+result.id+'.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  const received=result?.stages.length??0;
  const activePath=received%2===0?'chain':'source';
  const activeRound=Math.floor(received/2)+1;
  const locked=busy||Boolean(result);
  return <div className="app">
    <a className="skip-link" href="#original-memory">Skip to the memory</a>
    <header className="topbar">
      <a className="wordmark" href="/" aria-label="Third Telling home"><span className="paper-mark" aria-hidden="true"><i/><i/><i/></span>Third Telling<span className="wordmark-dot">.</span></a>
      <div className="local-status"><span className={'status-dot '+(health?.ready?'ready':health?'offline':'checking')} aria-hidden="true"/>
        <span>{health?.ready?<><strong>{health.model?.name}</strong><span className="status-location"> / on this device</span></>:health?'Local model not ready':'Checking local model'}</span>
      </div>
    </header>

    <main>
      <section className="intro" aria-labelledby="page-title">
        <div><p className="eyebrow">A small experiment in remembering</p><h1 id="page-title">What survives<br className="desktop-break"/> a retelling?</h1></div>
        <div className="intro-note"><p>One memory. Three tellings.</p><p>Let a local AI pass a story onward, then see what happens when it keeps the original close.</p><span className="intro-footnote">Fictional memories. Real model outputs.</span></div>
      </section>

      <div className="experiment-workspace">
        <aside className="source-panel" aria-label="Original memory and controls">
          <div className="section-heading"><span className="section-index">The source</span><span className="small-label">Keep this close</span></div>
          <fieldset className="sample-picker" disabled={busy}><legend>Start with a fictional memory</legend>
            {samples.map((sample,index)=><button type="button" className={sampleId===sample.id?'sample selected':'sample'} key={sample.id} aria-label={sample.title} aria-pressed={sampleId===sample.id} onClick={()=>chooseMemory(sample.id)}>
              <span className="sample-number">{String(index+1).padStart(2,'0')}</span><span>{sample.title}</span><span className="sample-arrow" aria-hidden="true">↗</span>
            </button>)}
            <button type="button" className="custom-memory" onClick={()=>chooseMemory(null)}>Or write your own <span aria-hidden="true">↗</span></button>
          </fieldset>
          <div className="original-heading"><label htmlFor="original-memory">Original memory</label><span>{wordCount(story)} words</span></div>
          <textarea id="original-memory" value={story} onChange={event=>changeStory(event.target.value)} readOnly={locked} maxLength={1500} spellCheck={false} placeholder="Write a short memory, or choose a fictional example above." aria-describedby="memory-help"/>
          <p id="memory-help" className="field-help">{locked?'This original is kept unchanged for the experiment.':'Up to 1,500 characters. Your story stays on this device.'}<span>{story.length}/1,500</span></p>
          <div className="phrase-controls"><label htmlFor="phrase-input">Details to follow <span>{phrases.length}/5</span></label>
            <p className="field-help">Choose exact phrases from the original.</p>
            <div className="selected-phrases">{phrases.map(value=><button type="button" className="phrase-chip" aria-label={'Remove phrase '+value} key={value} disabled={locked} onClick={()=>setPhrases(current=>current.filter(item=>item!==value))}>{value}<span aria-hidden="true">×</span></button>)}</div>
            {!locked&&<div className="add-phrase"><input id="phrase-input" aria-label="Phrase to follow" value={phrase} onChange={event=>setPhrase(event.target.value)} maxLength={80} disabled={phrases.length>=5} placeholder={phrases.length>=5?'Five phrases selected':'A name, a date, a small detail…'} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();addPhrase();}}}/>
              <button type="button" aria-label="Follow phrase" disabled={phrases.length>=5} onClick={addPhrase}>+</button></div>}
          </div>
          <div className="run-controls">{busy?<button className="primary-button cancel-button" type="button" onClick={()=>controller.current?.abort()} aria-label="Cancel experiment">Cancel experiment <span aria-hidden="true">×</span></button>:<button className="primary-button" type="button" onClick={()=>void start()} aria-label={result?'Run the tellings again':'Start the tellings'}>{result?'Run again':'Start the tellings'}<span aria-hidden="true">↗</span></button>}
            {result&&!busy&&<button className="text-button" type="button" onClick={()=>chooseMemory(sampleId)}>Start a new memory</button>}
          </div>
          <p className="privacy-note"><span aria-hidden="true">⌂</span> No accounts. No uploads to a cloud.<br/>Nothing is saved until you export.</p>
        </aside>

        <section className="comparison-panel" aria-label="The two retelling paths">
          <div className="comparison-toolbar"><p><span className="section-index">The tellings</span><span className="comparison-subtitle">Same model. Same instructions. Different source.</span></p>
            <button className="export-button" type="button" disabled={!result} onClick={exportResult}>Export JSON <span aria-hidden="true">↓</span></button></div>
          {error&&<div className="message error-message" role="alert"><strong>The thread broke.</strong><p>{error}</p></div>}
          {health&&!health.ready&&<div className="message model-message"><p>{health.message}</p><p className="field-help">Start local Ollama and download the configured model, then check again.</p><button className="text-button" type="button" onClick={()=>void checkHealth()}>Check local model</button></div>}
          <div className="experiment-status"><p role="status" aria-live="polite">{notice}</p><span className={'progress-dots '+(busy?'in-progress':'')} aria-label={received+' of 6 tellings received'}>{[0,1,2,3,4,5].map(index=><i key={index} className={index<received?'received':busy&&index===received?'current':''}/>)}</span></div>
          <div className="path-columns">{paths.map(path=><section className={'path path-'+path.id} key={path.id} aria-label={path.title}>
            <div className="path-heading"><span className="path-symbol" aria-hidden="true">{path.symbol}</span><div><h2>{path.title}</h2><p>{path.explanation}</p></div></div>
            {[1,2,3].map(round=><Telling key={round} path={path} round={round} stage={result?.stages.find(stage=>stage.path===path.id&&stage.round===round)} active={busy&&activePath===path.id&&activeRound===round} phrases={result?.phrases??phrases}/>)}
          </section>)}</div>
          <div className="reading-note"><span className="note-symbol" aria-hidden="true">↳</span><p><strong>Phrase matches are not a truth score.</strong><br/>A detail can be paraphrased and disappear from the tracker. A familiar name can survive inside a false sentence. Read both versions against the original.</p></div>
          <details className="experiment-details"><summary>About this experiment</summary><div><p>Each path makes three separate local model calls. Every call asks for about 70 words, with the same seed, temperature, context and token budget. The model may miss the word target; actual lengths are shown.</p>
            <p>This illustrates a small comparison, not a benchmark of human memory or a claim that returning to the original always helps. Model outputs are interpretations, not authentic memories.</p>
            {result&&<dl><dt>Model</dt><dd>{result.model.name} · {result.model.quantization}</dd><dt>Runtime</dt><dd>Ollama {result.model.runtimeVersion}</dd><dt>Settings</dt><dd>temperature {result.settings.temperature} · seed {result.settings.seed} · {result.settings.num_ctx} context tokens · {result.settings.num_predict} output tokens</dd><dt>Observed duration</dt><dd>{seconds(result.elapsedMs)}</dd></dl>}
            <p>Prompts, inputs, model identity and measurements are included in the JSON export. Refreshing the page clears this session.</p></div></details>
        </section>
      </div>
    </main>
    <footer><span>Third Telling <span aria-hidden="true">/</span> Ghost in the Machine, 2026</span><span>The original is worth keeping.</span></footer>
  </div>;
}
