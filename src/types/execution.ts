export interface SerializedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface SerializedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyParsed?: unknown;
}

export interface ValidationCheck {
  type: 'json-deep-equal' | 'regex' | 'status-code';
  path?: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface ExecutionResult {
  nodeId: string;
  requestedAt: string;
  durationMs: number;
  request: SerializedRequest;
  response?: SerializedResponse;
  validationResult: ValidationResult;
  error?: string;
  errorType?: 'NETWORK' | 'TIMEOUT' | 'CORS' | 'PARSE';
}

export interface ExecutionSummary {
  total: number;
  success: number;
  failed: number;
  durationMs: number;
}
