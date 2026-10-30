import { AppError } from '../shared/errors.ts';
import type { AppConfig } from './config.ts';
import type { InferenceRecord, InferenceRequest, ModelIdentity } from '../shared/types.ts';

function record(value: unknown): value is Record<string,unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function requestJson(config: AppConfig, path: string, init: RequestInit, signal: AbortSignal, timeoutMs: number): Promise<Record<string,unknown>> {
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = AbortSignal.any([signal,deadline]);
  try {
    const response = await fetch(config.ollamaUrl+path, {...init, signal:combined});
    if (!response.ok) throw new AppError('MODEL_UNAVAILABLE','Ollama could not run the local model. Check that it is running and has enough memory.',503);
    if (!response.body) throw new AppError('INVALID_MODEL_RESPONSE','The local model returned an empty response.',502);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 65536) {
        await reader.cancel();
        throw new AppError('INVALID_MODEL_RESPONSE','The local model response exceeded the supported size.',502);
      }
      chunks.push(next.value);
    }
    let value: unknown;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new AppError('INVALID_MODEL_RESPONSE','Ollama returned a response that could not be read.',502); }
    if (!record(value)) throw new AppError('INVALID_MODEL_RESPONSE','Ollama returned an unexpected response.',502);
    return value;
  } catch (error) {
    if (signal.aborted) throw new AppError('CANCELLED','The experiment was cancelled.',499);
    if (deadline.aborted) throw new AppError('MODEL_TIMEOUT','The local model took too long. Try a shorter memory or check MODEL_TIMEOUT_MS.',504);
    if (error instanceof AppError) throw error;
    throw new AppError('MODEL_UNAVAILABLE','Cannot reach local Ollama. Start it and check OLLAMA_URL.',503);
  }
}

export async function getModelInfo(config: AppConfig, signal = new AbortController().signal): Promise<ModelIdentity> {
  const timeout = Math.min(config.timeoutMs,5000);
  const [tags,version] = await Promise.all([
    requestJson(config,'/api/tags',{},signal,timeout),
    requestJson(config,'/api/version',{},signal,timeout)
  ]);
  const name = config.model.includes(':') ? config.model : config.model+':latest';
  const model = Array.isArray(tags.models) ? tags.models.find(value =>
    record(value) && (value.name === name || value.model === name)) as Record<string,unknown> | undefined : undefined;
  if (!model) throw new AppError('MODEL_MISSING','The selected model is not downloaded. Run ollama pull '+config.model+' on your local Ollama server.',503);
  const details = record(model.details) ? model.details : {};
  if (details.format !== 'gguf' || model.remote_host || model.remote_model) {
    throw new AppError('LOCAL_MODEL_REQUIRED','Choose a downloaded local GGUF model. Hosted models are not used by this app.',503);
  }
  if (typeof model.digest !== 'string' || typeof model.size !== 'number' || model.size <= 0) {
    throw new AppError('INVALID_MODEL_RESPONSE','Ollama did not provide a local model identity.',502);
  }
  return {
    name, digest:model.digest, sizeBytes:model.size,
    parameterSize:String(details.parameter_size ?? 'unknown'),
    quantization:String(details.quantization_level ?? 'unknown'),
    family:String(details.family ?? 'unknown'),
    runtimeVersion:typeof version.version === 'string' ? version.version : 'unknown'
  };
}

export async function generate(config: AppConfig, request: InferenceRequest, signal: AbortSignal): Promise<InferenceRecord> {
  const started = performance.now();
  const {temperature,seed,num_ctx,num_predict} = request.settings;
  const value = await requestJson(config,'/api/chat',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:request.settings.model, messages:request.messages, stream:false, keep_alive:'10m',
      options:{temperature,seed,num_ctx,num_predict}
    })
  },signal,config.timeoutMs);
  const message = record(value.message) ? value.message : {};
  if (value.done !== true || message.role !== 'assistant' || typeof message.content !== 'string'
    || !message.content.trim() || message.content.length > 4000) {
    throw new AppError('INVALID_MODEL_RESPONSE','The local model did not return a complete, usable retelling. Nothing was substituted.',502);
  }
  const number = (key:string, divisor=1): number | null =>
    typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0 ? value[key]/divisor : null;
  return {
    text:message.content.trim(), latencyMs:performance.now()-started,
    totalDurationMs:number('total_duration',1e6), loadDurationMs:number('load_duration',1e6),
    promptTokens:number('prompt_eval_count'), outputTokens:number('eval_count'),
    doneReason:typeof value.done_reason === 'string' ? value.done_reason : 'unknown'
  };
}
