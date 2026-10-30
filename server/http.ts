import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { AppError } from '../shared/errors.ts';
import { validateInput } from '../shared/input.ts';
import type { ModelSettings } from '../shared/types.ts';
import type { AppConfig } from './config.ts';
import { getModelInfo, generate } from './ollama.ts';
import { runExperiment } from './retell.ts';

export type AssetMiddleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => void;
const policy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'";
const mime: Record<string,string> = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
  response.end(JSON.stringify(value));
}
function settingsFor(model:string): ModelSettings {
  return {model,temperature:0,seed:42,num_ctx:2048,num_predict:256,targetWords:70};
}
async function readInput(request: IncomingMessage): Promise<unknown> {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new AppError('INVALID_INPUT','Send the memory as JSON.',400);
  }
  return new Promise((resolve,reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    const cleanup = () => { request.off('data',data); request.off('end',end); request.off('error',error); request.off('aborted',aborted); };
    const fail = (reason:AppError) => { cleanup(); request.resume(); reject(reason); };
    const data = (chunk:Buffer) => {
      bytes += chunk.length;
      if (bytes > 16384) { fail(new AppError('INPUT_TOO_LARGE','The request is too large. Keep the memory to 1,500 characters.',413)); return; }
      chunks.push(chunk);
    };
    const end = () => {
      cleanup();
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new AppError('INVALID_INPUT','The memory request could not be read.',400)); }
    };
    const error = () => fail(new AppError('INVALID_INPUT','The request was interrupted.',400));
    const aborted = () => fail(new AppError('CANCELLED','The request was cancelled.',499));
    request.on('data',data); request.on('end',end); request.on('error',error); request.on('aborted',aborted);
  });
}
async function staticFile(request: IncomingMessage, response: ServerResponse, pathname:string, config:AppConfig) {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); }
  catch { throw new AppError('INVALID_INPUT','The requested path is invalid.',400); }
  if (decoded.includes('\0') || decoded.includes('\\')) throw new AppError('INVALID_INPUT','The requested path is invalid.',400);
  const root = resolve(config.distDir);
  let path = resolve(root,'.'+decoded);
  const inside = relative(root,path);
  if (inside.startsWith('..') || resolve(root,inside) !== path) throw new AppError('NOT_FOUND','File not found.',404);
  if (!extname(path)) path = resolve(root,'index.html');
  let file:Buffer;
  try { file = await readFile(path); }
  catch { throw new AppError('NOT_FOUND','Build the app with npm run build before starting it.',404); }
  response.writeHead(200,{'Content-Type':mime[extname(path)] ?? 'application/octet-stream'});
  response.end(request.method === 'HEAD' ? undefined : file);
}

export function createApp(config:AppConfig, assets?: AssetMiddleware) {
  let busy = false;
  const server = createServer((request,response) => {
    void handle(request,response);
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;

  async function handle(request:IncomingMessage,response:ServerResponse) {
    response.setHeader('Cache-Control','no-store');
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Referrer-Policy','no-referrer');
    if (!config.development) response.setHeader('Content-Security-Policy',policy);
    try {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : config.port;
      const hosts = new Set(['127.0.0.1:'+port,'localhost:'+port,'[::1]:'+port]);
      const origins = new Set([...hosts].map(host=>'http://'+host));
      if (!hosts.has(request.headers.host ?? '') ||
        (request.headers.origin && !origins.has(request.headers.origin)) ||
        request.headers['sec-fetch-site'] === 'cross-site') {
        throw new AppError('LOCAL_ONLY','Open Third Telling directly on this computer.',403);
      }
      const path = new URL(request.url ?? '/','http://127.0.0.1:'+port).pathname;
      if (path === '/api/health' && request.method === 'GET') {
        try {
          const model = await getModelInfo(config);
          json(response,200,{ready:true,model,settings:settingsFor(model.name)});
        } catch (error) {
          const known = error instanceof AppError ? error : new AppError('MODEL_UNAVAILABLE','Cannot check the local model.',503);
          json(response,200,{ready:false,code:known.code,message:known.message,settings:settingsFor(config.model)});
        }
        return;
      }
      if (path === '/api/experiment' && request.method === 'POST') {
        if (busy) throw new AppError('BUSY','Another experiment is still running. Cancel it or wait for it to finish.',409);
        const input = validateInput(await readInput(request));
        if (busy) throw new AppError('BUSY','Another experiment started first. Please try again.',409);
        busy = true;
        const controller = new AbortController();
        const disconnected = () => { if (!response.writableEnded) controller.abort(); };
        response.once('close',disconnected);
        try {
          const model = await getModelInfo(config,controller.signal);
          response.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','X-Accel-Buffering':'no'});
          response.flushHeaders();
          for await (const event of runExperiment(input,{
            model,settings:settingsFor(model.name),signal:controller.signal,
            infer:(payload,signal)=>generate(config,payload,signal)
          })) {
            if (response.destroyed) break;
            response.write(JSON.stringify(event)+'\n');
          }
          response.end();
        } catch (error) {
          const known = error instanceof AppError ? error : new AppError('EXPERIMENT_FAILED','The experiment stopped unexpectedly. No replacement text was generated.',500);
          if (!response.destroyed) {
            if (response.headersSent) response.end(JSON.stringify({type:'error',code:known.code,message:known.message})+'\n');
            else json(response,known.status,{code:known.code,message:known.message});
          }
        } finally {
          controller.abort();
          response.off('close',disconnected);
          busy = false;
        }
        return;
      }
      if (path.startsWith('/api/')) throw new AppError('NOT_FOUND','Endpoint not found.',404);
      if (request.method !== 'GET' && request.method !== 'HEAD') throw new AppError('METHOD_NOT_ALLOWED','Method not allowed.',405);
      if (assets) { assets(request,response,()=>json(response,404,{message:'Page not found.'})); return; }
      await staticFile(request,response,path,config);
    } catch (error) {
      if (response.destroyed) return;
      const known = error instanceof AppError ? error : new AppError('REQUEST_FAILED','The local request could not be completed.',500);
      if (!response.headersSent) json(response,known.status,{code:known.code,message:known.message});
      else response.end();
    }
  }
  return server;
}
