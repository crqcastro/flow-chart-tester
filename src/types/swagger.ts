export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RouteParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body' | 'formData';
  required: boolean;
  description?: string;
  schema?: unknown;
  example?: unknown;
}

export interface RouteRequestBody {
  required: boolean;
  contentType: string;
  schema?: unknown;
  example?: unknown;
}

export interface RouteResponse {
  statusCode: string;
  description: string;
  schema?: unknown;
  example?: unknown;
}

export interface RouteDefinition {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  operationId?: string;
  tags: string[];
  parameters: RouteParameter[];
  requestBody?: RouteRequestBody;
  responses: Record<string, RouteResponse>;
  baseUrl: string;
}

export interface SwaggerSource {
  type: 'url' | 'file';
  url?: string;
  fileName?: string;
  rawContent: string;
}
