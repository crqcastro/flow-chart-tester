import { useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { useSwaggerStore } from '../store/swaggerStore';
import { serializeDiagram } from '../lib/xmlSerializer';
import { deserializeDiagram } from '../lib/xmlDeserializer';
import { parseSwagger } from '../lib/swaggerParser';
import { parsePostmanCollection } from '../lib/postmanParser';

export function useXmlIO() {
  const [error, setError] = useState<string | null>(null);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setDiagram = useFlowStore((s) => s.setDiagram);
  const { sources, appendRoutes, clearRoutes } = useSwaggerStore();

  function exportXml(name?: string) {
    try {
      const xml = serializeDiagram(nodes, edges, sources, name);
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(name ?? 'flowchart').replace(/\s+/g, '-').toLowerCase()}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`Erro ao exportar: ${(e as Error).message}`);
    }
  }

  async function importXml(file: File): Promise<boolean> {
    setError(null);
    try {
      const xml = await file.text();
      const { nodes: restoredNodes, edges: restoredEdges, sources: restoredSources } = deserializeDiagram(xml);

      // Re-hydrate swaggerStore: clear old state and add each source back
      clearRoutes();

      for (const importedSource of restoredSources) {
        if (!importedSource.source.rawContent) {
          // Source with no raw content (e.g. embedded manual routes)
          // Recover route definitions from the node data itself
          const routeDefs = restoredNodes
            .filter((n) => importedSource.routeIds.includes(n.data.route.id))
            .map((n) => n.data.route);

          if (routeDefs.length > 0) {
            appendRoutes(routeDefs, importedSource);
          }
          continue;
        }

        try {
          const routes = importedSource.type === 'postman'
            ? parsePostmanCollection(importedSource.source.rawContent)
            : parseSwagger(importedSource.source.rawContent);
          appendRoutes(routes, importedSource);
        } catch {
          // Fallback: use embedded route definitions from nodes
          const routeDefs = restoredNodes
            .filter((n) => importedSource.routeIds.includes(n.data.route.id))
            .map((n) => n.data.route);
          if (routeDefs.length > 0) {
            appendRoutes(routeDefs, importedSource);
          }
        }
      }

      setDiagram(restoredNodes, restoredEdges);
      return true;
    } catch (e) {
      setError(`Erro ao importar XML: ${(e as Error).message}`);
      return false;
    }
  }

  return { exportXml, importXml, error };
}
