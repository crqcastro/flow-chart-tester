import { XMLParser } from 'fast-xml-parser';
import type { FlowNode, FlowEdge, NodeConfig, EdgeData } from '../types/flow';
import type { SwaggerSource } from '../types/swagger';
import { parseSwagger } from './swaggerParser';
import { defaultNodeConfig } from '../types/flow';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  isArray: (name) => name === 'node' || name === 'edge',
});

interface ParsedXml {
  diagram?: {
    '@_version'?: string;
    meta?: { '@_name'?: string; '@_createdAt'?: string; '@_updatedAt'?: string };
    swaggerSource?: {
      '@_type'?: string;
      '@_url'?: string;
      '@_fileName'?: string;
      rawContent?: { __cdata?: string };
    };
    nodes?: { node?: ParsedNode[] };
    edges?: { edge?: ParsedEdge[] };
  };
}

interface ParsedNode {
  '@_id'?: string;
  '@_routeId'?: string;
  '@_x'?: string;
  '@_y'?: string;
  config?: { __cdata?: string };
}

interface ParsedEdge {
  '@_id'?: string;
  '@_source'?: string;
  '@_target'?: string;
  data?: { __cdata?: string };
}

export interface DeserializedDiagram {
  nodes: FlowNode[];
  edges: FlowEdge[];
  swaggerSource: SwaggerSource | null;
  name: string;
}

export function deserializeDiagram(xml: string): DeserializedDiagram {
  const parsed = parser.parse(xml) as ParsedXml;

  if (!parsed.diagram) {
    throw new Error('Arquivo XML inválido: elemento <diagram> não encontrado.');
  }

  const diag = parsed.diagram;
  const version = diag['@_version'] ?? '1.0';

  if (version !== '1.0') {
    throw new Error(`Versão do diagrama não suportada: ${version}`);
  }

  const name = diag.meta?.['@_name'] ?? 'Fluxo importado';

  // Restore swagger source and parse routes
  const ss = diag.swaggerSource;
  let swaggerSource: SwaggerSource | null = null;
  let rawContent = '';

  if (ss && ss['@_type'] !== 'none') {
    try {
      const encoded = ss.rawContent?.__cdata ?? '';
      rawContent = encoded ? decodeURIComponent(escape(atob(encoded))) : '';
    } catch {
      rawContent = '';
    }

    swaggerSource = {
      type: (ss['@_type'] as 'url' | 'file') ?? 'file',
      url: ss['@_url'],
      fileName: ss['@_fileName'],
      rawContent,
    };
  }

  // Parse routes from saved swagger content
  let routeMap = new Map<string, ReturnType<typeof parseSwagger>[number]>();
  if (rawContent) {
    try {
      const routes = parseSwagger(rawContent);
      routeMap = new Map(routes.map((r) => [r.id, r]));
    } catch {
      // ignore parse errors — nodes will be skipped
    }
  }

  // Restore nodes
  const parsedNodes = diag.nodes?.node ?? [];
  const nodes: FlowNode[] = [];

  for (const n of parsedNodes) {
    const id = n['@_id'];
    const routeId = n['@_routeId'];
    if (!id || !routeId) continue;

    const route = routeMap.get(routeId);
    if (!route) continue;

    let config: NodeConfig = defaultNodeConfig(route);
    try {
      const raw = n.config?.__cdata;
      if (raw) config = { ...config, ...(JSON.parse(raw) as Partial<NodeConfig>) };
    } catch { /* keep defaults */ }

    nodes.push({
      id,
      type: 'route',
      position: { x: Number(n['@_x'] ?? 0), y: Number(n['@_y'] ?? 0) },
      data: { route, config, executionStatus: 'idle' },
    });
  }

  // Restore edges
  const parsedEdges = diag.edges?.edge ?? [];
  const edges: FlowEdge[] = [];

  for (const e of parsedEdges) {
    const id = e['@_id'];
    const source = e['@_source'];
    const target = e['@_target'];
    if (!id || !source || !target) continue;

    let data: EdgeData = { strategy: 'sequential', fieldMappings: [] };
    try {
      const raw = e.data?.__cdata;
      if (raw) data = JSON.parse(raw) as EdgeData;
    } catch { /* keep defaults */ }

    edges.push({
      id,
      source,
      target,
      data,
      style: { stroke: data.strategy === 'sequential' ? '#6b7280' : '#8b5cf6', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as const },
    });
  }

  return { nodes, edges, swaggerSource, name };
}
