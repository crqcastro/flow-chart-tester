import type { FlowNode, FlowEdge, NodeConfig } from '../types/flow';
import type { ExecutionResult, SerializedRequest, SerializedResponse } from '../types/execution';
import { validateResponse } from './responseValidator';
import { applyFieldMappings, applyFullResponse } from './fieldMapper';

function topoSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) continue;
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: FlowNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = nodes.find((n) => n.id === id);
    if (node) sorted.push(node);
    for (const neighbor of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // Include any nodes in cycles as skipped (append remaining)
  const included = new Set(sorted.map((n) => n.id));
  for (const node of nodes) {
    if (!included.has(node.id)) sorted.push(node);
  }

  return sorted;
}

function buildUrl(config: NodeConfig, route: FlowNode['data']['route']): string {
  const base = (config.baseUrlOverride ?? route.baseUrl).replace(/\/$/, '');
  let path = route.path;

  for (const param of config.pathParams) {
    if (param.enabled !== false && param.value) {
      path = path.replace(`{${param.key}}`, encodeURIComponent(param.value));
    }
  }

  const queryParts = config.queryParams
    .filter((q) => q.enabled && q.value)
    .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`);

  return base + path + (queryParts.length ? `?${queryParts.join('&')}` : '');
}

function buildHeaders(config: NodeConfig): Record<string, string> {
  return Object.fromEntries(
    config.headers
      .filter((h) => h.enabled && h.key)
      .map((h) => [h.key, h.value])
  );
}

async function executeNode(
  node: FlowNode,
  effectiveConfig: NodeConfig,
  proxyUrl?: string
): Promise<ExecutionResult> {
  const { route } = node.data;
  const startTime = Date.now();
  const requestedAt = new Date().toISOString();

  const rawUrl = buildUrl(effectiveConfig, route);
  const url = proxyUrl ? `${proxyUrl.replace(/\/$/, '')}/${encodeURIComponent(rawUrl)}` : rawUrl;
  const headers = buildHeaders(effectiveConfig);

  const isBodyMethod = !['GET', 'HEAD', 'OPTIONS'].includes(route.method);
  const body = isBodyMethod && effectiveConfig.payloadJson?.trim()
    ? effectiveConfig.payloadJson
    : undefined;

  if (body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const request: SerializedRequest = { method: route.method, url, headers, body };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveConfig.timeoutMs ?? 30000);

  try {
    const res = await fetch(url, {
      method: route.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const resText = await res.text();
    let bodyParsed: unknown;
    try { bodyParsed = JSON.parse(resText); } catch { /* not JSON */ }

    const resHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => { resHeaders[key] = val; });

    const response: SerializedResponse = {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
      body: resText,
      bodyParsed,
    };

    const validationResult = validateResponse(
      response,
      effectiveConfig.expectedJson,
      effectiveConfig.expectedMode
    );

    return {
      nodeId: node.id,
      requestedAt,
      durationMs: Date.now() - startTime,
      request,
      response,
      validationResult,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error).name === 'AbortError';
    const errorType = isAbort ? 'TIMEOUT' : 'NETWORK';
    const isCors = !isAbort && err instanceof TypeError;
    return {
      nodeId: node.id,
      requestedAt,
      durationMs: Date.now() - startTime,
      request,
      validationResult: { passed: false, checks: [] },
      error: isAbort
        ? `Tempo limite esgotado (${effectiveConfig.timeoutMs}ms)`
        : isCors
        ? 'Requisição bloqueada por CORS ou erro de rede. Configure um proxy nas configurações.'
        : `Erro: ${(err as Error).message}`,
      errorType: isCors ? 'CORS' : errorType,
    };
  }
}

export interface RunOptions {
  proxyUrl?: string;
  onNodeStart?: (nodeId: string) => void;
  onNodeEnd?: (result: ExecutionResult) => void;
}

export async function runFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: RunOptions = {}
): Promise<ExecutionResult[]> {
  const { proxyUrl, onNodeStart, onNodeEnd } = options;
  const sorted = topoSort(nodes, edges);
  const results: ExecutionResult[] = [];
  const resultsByNodeId = new Map<string, ExecutionResult>();

  for (const node of sorted) {
    if (!node.data.config.enabled) continue;

    // Find incoming edges to resolve data flow
    const incomingEdges = edges.filter((e) => e.target === node.id);
    let effectiveConfig = { ...node.data.config };

    for (const edge of incomingEdges) {
      const prevResult = resultsByNodeId.get(edge.source);
      if (!prevResult?.response?.bodyParsed) continue;

      const strategy = edge.data?.strategy ?? 'sequential';
      if (strategy === 'full-response') {
        effectiveConfig = applyFullResponse(prevResult.response.bodyParsed, effectiveConfig);
      } else if (strategy === 'map-fields' && edge.data?.fieldMappings?.length) {
        effectiveConfig = applyFieldMappings(
          prevResult.response.bodyParsed,
          effectiveConfig,
          edge.data.fieldMappings
        );
      }
    }

    onNodeStart?.(node.id);
    const result = await executeNode(node, effectiveConfig, proxyUrl);
    results.push(result);
    resultsByNodeId.set(node.id, result);
    onNodeEnd?.(result);
  }

  return results;
}
