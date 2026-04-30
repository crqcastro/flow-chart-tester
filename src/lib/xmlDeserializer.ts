import { XMLParser } from 'fast-xml-parser';
import type { FlowNode, FlowEdge, NodeConfig, EdgeData } from '../types/flow';
import type { RouteDefinition, SwaggerSource } from '../types/swagger';
import type { ImportedSource } from '../store/swaggerStore';
import { parseSwagger } from './swaggerParser';
import { parsePostmanCollection } from './postmanParser';
import { defaultNodeConfig } from '../types/flow';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  isArray: (name) => ['node', 'edge', 'source'].includes(name),
});

interface ParsedXml {
  diagram?: {
    '@_version'?: string;
    meta?: { '@_name'?: string };
    sources?: { source?: ParsedSource[] };
    // legacy v1.0 single source
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

interface ParsedSource {
  '@_type'?: string;
  '@_label'?: string;
  '@_sourceType'?: string;
  '@_url'?: string;
  '@_fileName'?: string;
  rawContent?: { __cdata?: string };
}

interface ParsedNode {
  '@_id'?: string;
  '@_routeId'?: string;
  '@_x'?: string;
  '@_y'?: string;
  config?: { __cdata?: string };
  routeDef?: { __cdata?: string };
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
  sources: ImportedSource[];
  name: string;
}

function decodeBase64(encoded: string): string {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return '';
  }
}

function parseSourceContent(rawContent: string, type: string): RouteDefinition[] {
  if (!rawContent) return [];
  try {
    if (type === 'postman') return parsePostmanCollection(rawContent);
    return parseSwagger(rawContent);
  } catch {
    return [];
  }
}

export function deserializeDiagram(xml: string): DeserializedDiagram {
  const parsed = parser.parse(xml) as ParsedXml;

  if (!parsed.diagram) {
    throw new Error('Arquivo XML inválido: elemento <diagram> não encontrado.');
  }

  const diag = parsed.diagram;
  const version = diag['@_version'] ?? '1.0';
  const name = diag.meta?.['@_name'] ?? 'Fluxo importado';

  // Build a complete route map from all sources + embedded routeDefs
  const routeMap = new Map<string, RouteDefinition>();

  // --- v1.1: multiple sources ---
  const importedSources: ImportedSource[] = [];

  const parsedSources = diag.sources?.source ?? [];

  for (const s of parsedSources) {
    const encoded = s.rawContent?.__cdata ?? '';
    const rawContent = encoded ? decodeBase64(encoded) : '';
    const sourceType = (s['@_type'] ?? 'swagger') as ImportedSource['type'];
    const label = s['@_label'] ?? s['@_url'] ?? s['@_fileName'] ?? 'source';

    const routes = parseSourceContent(rawContent, sourceType);
    const swaggerSource: SwaggerSource = {
      type: (s['@_sourceType'] as 'url' | 'file') ?? 'file',
      url: s['@_url'],
      fileName: s['@_fileName'],
      rawContent,
    };

    for (const r of routes) routeMap.set(r.id, r);

    importedSources.push({
      type: sourceType,
      label,
      source: swaggerSource,
      routeIds: routes.map((r) => r.id),
    });
  }

  // --- v1.0 legacy: single swaggerSource ---
  if (version === '1.0' && diag.swaggerSource) {
    const ss = diag.swaggerSource;
    const encoded = ss.rawContent?.__cdata ?? '';
    const rawContent = encoded ? decodeBase64(encoded) : '';
    const routes = rawContent ? (() => { try { return parseSwagger(rawContent); } catch { return []; } })() : [];
    for (const r of routes) routeMap.set(r.id, r);

    if (routes.length > 0) {
      const swaggerSource: SwaggerSource = {
        type: (ss['@_type'] as 'url' | 'file') ?? 'file',
        url: ss['@_url'],
        fileName: ss['@_fileName'],
        rawContent,
      };
      importedSources.push({
        type: 'swagger',
        label: ss['@_url'] ?? ss['@_fileName'] ?? 'swagger',
        source: swaggerSource,
        routeIds: routes.map((r) => r.id),
      });
    }
  }

  // Restore nodes
  const parsedNodes = diag.nodes?.node ?? [];
  const nodes: FlowNode[] = [];
  const manualRouteIds: string[] = [];

  for (const n of parsedNodes) {
    const id = n['@_id'];
    const routeId = n['@_routeId'];
    if (!id || !routeId) continue;

    // Try source-derived route first, then fall back to embedded routeDef
    let route = routeMap.get(routeId);

    if (!route && n.routeDef?.__cdata) {
      try {
        route = JSON.parse(n.routeDef.__cdata) as RouteDefinition;
        routeMap.set(routeId, route);
        // Track as manually-defined (either actual manual or from removed source)
        manualRouteIds.push(routeId);
      } catch { /* skip */ }
    }

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

  // If there are routes restored from embedded routeDefs that aren't in any source, add a "manual" source
  if (manualRouteIds.length > 0) {
    const routes = manualRouteIds.map((id) => routeMap.get(id)!).filter(Boolean);
    importedSources.push({
      type: 'manual',
      label: 'manual',
      source: { type: 'file', fileName: 'manual', rawContent: '' },
      routeIds: manualRouteIds,
    });
    // These are already in routeMap, just make sure they're in swaggerStore later
    void routes; // used via routeMap
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
      id, source, target, data,
      style: { stroke: data.strategy === 'sequential' ? '#6b7280' : '#8b5cf6', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as const },
    });
  }

  // Build all routes list for re-hydrating swaggerStore
  const allRoutes = [...routeMap.values()];
  // Attach routes list to the first source (or create synthetic) for the store to use
  if (importedSources.length > 0 && allRoutes.length > 0) {
    // Each source already has routeIds set correctly
  }

  return { nodes, edges, sources: importedSources, name };
}
