import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../server/config.ts';
test('uses the documented local defaults',()=>{
 const c=loadConfig({});
 assert.equal(c.port,3210); assert.equal(c.ollamaUrl,'http://127.0.0.1:11434');
 assert.equal(c.model,'gemma3:1b'); assert.equal(c.timeoutMs,120000);
});
test('preserves changed deployment settings',()=>{
 const c=loadConfig({PORT:'4321',OLLAMA_URL:'http://localhost:11999/',OLLAMA_MODEL:'gemma3:270m',MODEL_TIMEOUT_MS:'4000'});
 assert.equal(c.port,4321); assert.equal(c.ollamaUrl,'http://localhost:11999');
 assert.equal(c.model,'gemma3:270m'); assert.equal(c.timeoutMs,4000);
});
test('rejects remote model URLs, credentials, invalid ports and invalid timeouts',()=>{
 for(const env of [{OLLAMA_URL:'https://example.com'}, {OLLAMA_URL:'http://user:pass@localhost:11434'}, {OLLAMA_URL:'file:///tmp/model'}, {OLLAMA_URL:'http://localhost:11434/other'}, {PORT:'0'}, {PORT:'3210junk'}, {MODEL_TIMEOUT_MS:'NaN'}, {MODEL_TIMEOUT_MS:'0'}]) assert.throws(()=>loadConfig(env),{code:'INVALID_CONFIG'});
});
