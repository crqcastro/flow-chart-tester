import type { FlowNode, FlowEdge, NodeConfig } from '../types/flow';
import type { ResponseExtractor } from '../types/environment';
import type { ExecutionResult, SerializedRequest, SerializedResponse } from '../types/execution';
import { validateResponse } from './responseValidator';
import { applyFieldMappings, applyFullResponse } from './fieldMapper';
import { resolveVariables } from './variableResolver';
import { JSONPath } from 'jsonpath-plus';

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

  const included = new Set(sorted.map((n) => n.id));
  for (const node of nodes) {
    if (!included.has(node.id)) sorted.push(node);
  }

  return sorted;
}

/** Apply {{variable}} substitution to every user-editable string in the config.
 *  The route is required so we can resolve variables embedded in the original
 *  baseUrl / path even when the user hasn't set an explicit override. */
function resolveConfigVars(
  config: NodeConfig,
  vars: Record<string, string>,
  route: FlowNode['data']['route']
): NodeConfig {
  if (Object.keys(vars).length === 0) return config;
  const r = (s: string) => resolveVariables(s, vars);
  // Resolve the URL: user provides the complete URL, only {{vars}} are substituted
  const rawUrl = config.urlOverride ?? (route.baseUrl + route.path);
  return {
    ...config,
    urlOverride: r(rawUrl) || undefined,
    payloadJson: r(config.payloadJson),
    headers: config.headers.map((h) => ({ ...h, key: r(h.key), value: r(h.value) })),
    pathParams: config.pathParams.map((p) => ({ ...p, value: r(p.value) })),
    queryParams: config.queryParams.map((q) => ({ ...q, value: r(q.value) })),
  };
}

function buildUrl(config: NodeConfig, route: FlowNode['data']['route']): string {
  // User provides the complete URL; only path param substitution and query string appending happen
  let url = config.urlOverride ?? (route.baseUrl + route.path);

  for (const param of config.pathParams) {
    if (param.enabled !== false && param.value) {
      url = url.replace(`{${param.key}}`, encodeURIComponent(param.value));
    }
  }

  const queryParts = config.queryParams
    .filter((q) => q.enabled && q.value)
    .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`);

  return url + (queryParts.length ? `?${queryParts.join('&')}` : '');
}

function buildHeaders(config: NodeConfig): Record<string, string> {
  return Object.fromEntries(
    config.headers
      .filter((h) => h.enabled && h.key)
      .map((h) => [h.key, h.value])
  );
}

/** Run response extractors and return { variableName → extractedValue } */
function runExtractors(
  response: SerializedResponse,
  extractors: ResponseExtractor[]
): Record<string, string> {
  const extracted: Record<string, string> = {};

  for (const extractor of extractors) {
    if (!extractor.variableName || !extractor.expression) continue;

    try {
      let value: string | undefined;

      if (extractor.source === 'header') {
        const headerKey = (extractor.headerName ?? extractor.expression).toLowerCase();
        value = response.headers[headerKey];
      } else if (extractor.extractType === 'jsonpath') {
        const result = JSONPath({
          path: extractor.expression,
          json: response.bodyParsed as object,
          wrap: false,
        });
        if (result !== undefined && result !== null) {
          value = typeof result === 'string' ? result : JSON.stringify(result);
        }
      } else {
        // regex
        const re = new RegExp(extractor.expression);
        const match = re.exec(response.body);
        if (match) {
          // Use first capture group if available, otherwise full match
          value = match[1] ?? match[0];
        }
      }

      if (value !== undefined) {
        extracted[extractor.variableName] = value;
      }
    } catch {
      // extractor failed silently — user will see no value change
    }
  }

  return extracted;
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

  const effectiveMethod = effectiveConfig.methodOverride ?? route.method;
  const isBodyMethod = !['GET', 'HEAD', 'OPTIONS'].includes(effectiveMethod);
  const body = isBodyMethod && effectiveConfig.payloadJson?.trim()
    ? effectiveConfig.payloadJson
    : undefined;

  if (body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const request: SerializedRequest = { method: effectiveMethod, url, headers, body };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveConfig.timeoutMs ?? 30000);

  try {
    const res = await fetch(url, {
      method: effectiveMethod,
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

    const extractedVars = runExtractors(response, effectiveConfig.responseExtractors ?? []);

    return {
      nodeId: node.id,
      requestedAt,
      durationMs: Date.now() - startTime,
      request,
      response,
      validationResult,
      extractedVars,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error).name === 'AbortError';
    const isCors = !isAbort && err instanceof TypeError;
    return {
      nodeId: node.id,
      requestedAt,
      durationMs: Date.now() - startTime,
      request,
      validationResult: { passed: false, checks: [] },
      extractedVars: {},
      error: isAbort
        ? `Tempo limite esgotado (${effectiveConfig.timeoutMs}ms)`
        : isCors
        ? 'Requisição bloqueada por CORS ou erro de rede. Configure um proxy nas configurações.'
        : `Erro: ${(err as Error).message}`,
      errorType: isCors ? 'CORS' : isAbort ? 'TIMEOUT' : 'NETWORK',
    };
  }
}

export interface RunOptions {
  proxyUrl?: string;
  vars?: Record<string, string>;
  onNodeStart?: (nodeId: string) => void;
  onNodeEnd?: (result: ExecutionResult) => void;
  onVarsUpdated?: (vars: Record<string, string>) => void;
}

export async function runFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: RunOptions = {}
): Promise<ExecutionResult[]> {
  const { proxyUrl, onNodeStart, onNodeEnd, onVarsUpdated } = options;

  // Mutable copy of vars — updated as extractors run
  const liveVars: Record<string, string> = { ...(options.vars ?? {}) };

  const sorted = topoSort(nodes, edges);
  const results: ExecutionResult[] = [];
  const resultsByNodeId = new Map<string, ExecutionResult>();

  for (const node of sorted) {
    if (!node.data.config.enabled) continue;

    // Resolve incoming edge data flow
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

    // Resolve {{variables}} with current live vars (including route baseUrl/path fallbacks)
    effectiveConfig = resolveConfigVars(effectiveConfig, liveVars, node.data.route);

    onNodeStart?.(node.id);
    const result = await executeNode(node, effectiveConfig, proxyUrl);
    results.push(result);
    resultsByNodeId.set(node.id, result);

    // Apply extracted vars so next nodes can use them
    if (result.extractedVars && Object.keys(result.extractedVars).length > 0) {
      Object.assign(liveVars, result.extractedVars);
      onVarsUpdated?.(result.extractedVars);
    }

    onNodeEnd?.(result);
  }

  return results;
}
