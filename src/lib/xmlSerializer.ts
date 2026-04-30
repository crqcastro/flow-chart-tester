import { XMLBuilder } from 'fast-xml-parser';
import type { FlowNode, FlowEdge } from '../types/flow';
import type { ImportedSource } from '../store/swaggerStore';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  format: true,
  indentBy: '  ',
});

export function serializeDiagram(
  nodes: FlowNode[],
  edges: FlowEdge[],
  sources: ImportedSource[],
  name = 'Meu Fluxo'
): string {
  const now = new Date().toISOString();

  // Embed each imported source as a sourceDef element
  const sourceDefs = sources.map((s) => ({
    '@_type': s.type,
    '@_label': s.label,
    '@_sourceType': s.source.type,
    ...(s.source.url ? { '@_url': s.source.url } : {}),
    ...(s.source.fileName ? { '@_fileName': s.source.fileName } : {}),
    rawContent: {
      __cdata: s.source.rawContent
        ? btoa(unescape(encodeURIComponent(s.source.rawContent)))
        : '',
    },
  }));

  // Each node embeds its full RouteDefinition so the diagram is self-contained
  const xmlNodes = nodes.map((n) => ({
    '@_id': n.id,
    '@_routeId': n.data.route.id,
    '@_x': String(n.position.x),
    '@_y': String(n.position.y),
    config: { __cdata: JSON.stringify(n.data.config) },
    // Embed the route definition for routes that don't come from a parseable source
    routeDef: { __cdata: JSON.stringify(n.data.route) },
  }));

  const xmlEdges = edges.map((e) => ({
    '@_id': e.id,
    '@_source': e.source,
    '@_target': e.target,
    data: { __cdata: JSON.stringify(e.data ?? { strategy: 'sequential', fieldMappings: [] }) },
  }));

  const diagram = {
    diagram: {
      '@_version': '1.1',
      meta: {
        '@_name': name,
        '@_createdAt': now,
        '@_updatedAt': now,
      },
      sources: sourceDefs.length ? { source: sourceDefs } : {},
      nodes: { node: xmlNodes },
      edges: xmlEdges.length ? { edge: xmlEdges } : {},
    },
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build(diagram);
}
