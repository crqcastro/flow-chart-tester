export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface ResponseExtractor {
  id: string;
  variableName: string;
  source: 'body' | 'header';
  extractType: 'jsonpath' | 'regex';
  expression: string;   // JSONPath ($.field) or regex with optional capture group
  headerName?: string;  // used when source === 'header'
}
