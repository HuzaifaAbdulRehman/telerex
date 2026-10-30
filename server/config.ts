import { fileURLToPath } from 'node:url';
import { AppError } from '../shared/errors.ts';

export interface AppConfig {
  port: number; ollamaUrl: string; model: string; timeoutMs: number;
  distDir: string; development?: boolean;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fail = (message:string): never => { throw new AppError('INVALID_CONFIG', message, 500); };
  const integer = (value:string, name:string, max:number) => {
    if (!/^\d+$/u.test(value)) return fail(name+' must be a positive integer.');
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 1 || result > max) return fail(name+' is out of range.');
    return result;
  };
  let url: URL;
  try { url = new URL(env.OLLAMA_URL ?? 'http://127.0.0.1:11434'); }
  catch { return fail('OLLAMA_URL must be a local HTTP URL.'); }
  if (!['http:','https:'].includes(url.protocol) || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    return fail('OLLAMA_URL must point to a loopback Ollama server, without credentials or a path.');
  }
  const model = env.OLLAMA_MODEL ?? 'gemma3:1b';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,120}$/u.test(model)) return fail('OLLAMA_MODEL is not a valid local model name.');
  return {
    port:integer(env.PORT ?? '3210','PORT',65535), ollamaUrl:url.origin,
    model, timeoutMs:integer(env.MODEL_TIMEOUT_MS ?? '120000','MODEL_TIMEOUT_MS',300000),
    distDir:fileURLToPath(new URL('../dist/',import.meta.url))
  };
}
