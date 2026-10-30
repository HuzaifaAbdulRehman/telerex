export type PathName = 'chain' | 'source';
export type Round = 1 | 2 | 3;

export interface ExperimentInput { story: string; phrases: string[] }
export interface ModelSettings {
  model: string; temperature: number; seed: number;
  num_ctx: number; num_predict: number; targetWords: number;
}
export interface ModelIdentity {
  name: string; digest: string; sizeBytes: number; parameterSize: string;
  quantization: string; family: string; runtimeVersion: string;
}
export interface Message { role: 'system' | 'user'; content: string }
export interface InferenceRequest { input: string; messages: Message[]; settings: ModelSettings }
export interface InferenceRecord {
  text: string; latencyMs: number; totalDurationMs: number | null;
  loadDurationMs: number | null; promptTokens: number | null;
  outputTokens: number | null; doneReason: string;
}
export interface PhraseMatch { phrase: string; present: boolean; occurrences: number }
export interface Stage extends InferenceRecord {
  path: PathName; round: Round; input: string; messages: Message[];
  words: number; phraseMatches: PhraseMatch[]; outputLimitReached: boolean;
}
export interface ExperimentResult {
  schemaVersion: 1; id: string; createdAt: string; completedAt: string | null;
  status: 'running' | 'complete' | 'cancelled' | 'error';
  original: string; phrases: string[]; model: ModelIdentity;
  settings: ModelSettings; stages: Stage[]; elapsedMs: number;
}
export type ExperimentEvent =
  | { type: 'start'; result: ExperimentResult }
  | { type: 'stage'; stage: Stage }
  | { type: 'complete'; result: ExperimentResult }
  | { type: 'error'; code: string; message: string };

export type Infer = (request: InferenceRequest, signal: AbortSignal) => Promise<InferenceRecord>;
