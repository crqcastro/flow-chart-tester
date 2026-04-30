import { XMLBuilder } from 'fast-xml-parser';
import type { FlowNode, FlowEdge } from '../types/flow';
import type { SwaggerSource } from '../types/swagger';

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
  swaggerSource: SwaggerSource | null,
  name = 'Meu Fluxo'
): string {
  const now = new Date().toISOString();

  const xmlNodes = nodes.map((n) => ({
    '@_id': n.id,
    '@_routeId': n.data.route.id,
    '@_x': String(n.position.x),
    '@_y': String(n.position.y),
    config: { __cdata: JSON.stringify(n.data.config) },
  }));

  const xmlEdges = edges.map((e) => ({
    '@_id': e.id,
    '@_source': e.source,
    '@_target': e.target,
    data: { __cdata: JSON.stringify(e.data ?? { strategy: 'sequential', fieldMappings: [] }) },
  }));

  const swaggerSourceXml = swaggerSource
    ? {
        '@_type': swaggerSource.type,
        ...(swaggerSource.url ? { '@_url': swaggerSource.url } : {}),
        ...(swaggerSource.fileName ? { '@_fileName': swaggerSource.fileName } : {}),
        rawContent: { __cdata: btoa(unescape(encodeURIComponent(swaggerSource.rawContent))) },
      }
    : { '@_type': 'none', rawContent: { __cdata: '' } };

  const diagram = {
    diagram: {
      '@_version': '1.0',
      meta: {
        '@_name': name,
        '@_createdAt': now,
        '@_updatedAt': now,
      },
      swaggerSource: swaggerSourceXml,
      nodes: { node: xmlNodes },
      edges: xmlEdges.length ? { edge: xmlEdges } : {},
    },
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build(diagram);
}
