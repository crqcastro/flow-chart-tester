import type { Node, Edge } from '@xyflow/react';
import type { RouteDefinition } from './swagger';
import type { ResponseExtractor } from './environment';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface NodeConfig {
  headers: KeyValuePair[];
  payloadJson: string;
  expectedJson: string;
  expectedMode: 'json' | 'regex';
  pathParams: KeyValuePair[];
  queryParams: KeyValuePair[];
  enabled: boolean;
  baseUrlOverride?: string;
  timeoutMs: number;
  responseExtractors: ResponseExtractor[];
}

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

export interface RouteNodeData extends Record<string, unknown> {
  route: RouteDefinition;
  config: NodeConfig;
  executionStatus: ExecutionStatus;
}

export type FlowNode = Node<RouteNodeData, 'route'>;

export type DataFlowStrategy = 'full-response' | 'map-fields' | 'sequential';

export interface FieldMapping {
  id: string;
  sourceJsonPath: string;
  targetField: string;
  targetType: 'body' | 'header' | 'query' | 'path';
}

export interface EdgeData extends Record<string, unknown> {
  strategy: DataFlowStrategy;
  fieldMappings: FieldMapping[];
  label?: string;
}

export type FlowEdge = Edge<EdgeData>;

export function defaultNodeConfig(route: RouteDefinition): NodeConfig {
  const pathParams: KeyValuePair[] = route.parameters
    .filter((p) => p.in === 'path')
    .map((p, i) => ({ id: `path_${i}`, key: p.name, value: String(p.example ?? ''), enabled: true }));

  const queryParams: KeyValuePair[] = route.parameters
    .filter((p) => p.in === 'query')
    .map((p, i) => ({ id: `query_${i}`, key: p.name, value: String(p.example ?? ''), enabled: p.required ?? false }));

  const headers: KeyValuePair[] = route.parameters
    .filter((p) => p.in === 'header')
    .map((p, i) => ({ id: `header_${i}`, key: p.name, value: String(p.example ?? ''), enabled: true }));

  const payloadJson = route.requestBody?.example != null
    ? JSON.stringify(route.requestBody.example, null, 2)
    : '';

  const firstResponse = Object.values(route.responses)[0];
  const expectedJson = firstResponse?.example != null
    ? JSON.stringify(firstResponse.example, null, 2)
    : '';

  return {
    headers,
    payloadJson,
    expectedJson,
    expectedMode: 'json',
    pathParams,
    queryParams,
    enabled: true,
    timeoutMs: 30000,
    responseExtractors: [],
  };
}
