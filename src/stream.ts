import { AppError } from '../shared/errors.ts';
import type { ExperimentEvent } from '../shared/types.ts';

export async function consumeExperiment(response: Response, onEvent: (event:ExperimentEvent)=>void): Promise<void> {
  if (!response.ok) {
    const value = await response.json().catch(()=>null);
    throw new AppError(typeof value?.code === 'string' ? value.code : 'REQUEST_FAILED',
      typeof value?.message === 'string' ? value.message : 'The local experiment could not start.',response.status);
  }
  if (!response.body) throw new AppError('INCOMPLETE_STREAM','The connection ended before the experiment completed.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let complete = false;
  const accept = (line:string) => {
    if (!line.trim()) return;
    if (complete) throw new AppError('INVALID_STREAM','Unexpected data arrived after the experiment completed.');
    let event: ExperimentEvent;
    try { event = JSON.parse(line) as ExperimentEvent; }
    catch { throw new AppError('INVALID_STREAM','The local experiment returned unreadable data.'); }
    if (!event || !['start','stage','complete','error'].includes(event.type)) {
      throw new AppError('INVALID_STREAM','The local experiment returned an unexpected event.');
    }
    if (event.type === 'error') throw new AppError(event.code,event.message);
    if (event.type === 'complete') {
      if (event.result?.status !== 'complete' || event.result.stages?.length !== 6) {
        throw new AppError('INCOMPLETE_STREAM','The connection ended before the experiment completed.');
      }
      complete = true;
    }
    onEvent(event);
  };
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      pending += decoder.decode(part.value,{stream:true});
      if (pending.length > 1000000) throw new AppError('INVALID_STREAM','The local response exceeded the supported size.');
      let newline: number;
      while ((newline = pending.indexOf('\n')) >= 0) {
        accept(pending.slice(0,newline));
        pending = pending.slice(newline+1);
      }
    }
    pending += decoder.decode();
    if (pending.trim()) accept(pending);
    if (!complete) throw new AppError('INCOMPLETE_STREAM','The connection ended before the experiment completed.');
  } catch (error) {
    await reader.cancel().catch(()=>{});
    throw error;
  } finally { reader.releaseLock(); }
}
