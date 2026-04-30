import { useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { useSwaggerStore } from '../store/swaggerStore';
import { serializeDiagram } from '../lib/xmlSerializer';
import { deserializeDiagram } from '../lib/xmlDeserializer';

export function useXmlIO() {
  const [error, setError] = useState<string | null>(null);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setDiagram = useFlowStore((s) => s.setDiagram);
  const source = useSwaggerStore((s) => s.source);
  const setRoutes = useSwaggerStore((s) => s.setRoutes);

  function exportXml(name?: string) {
    try {
      const xml = serializeDiagram(nodes, edges, source, name);
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
      const { nodes: restoredNodes, edges: restoredEdges, swaggerSource } = deserializeDiagram(xml);

      if (swaggerSource?.rawContent) {
        const { parseSwagger } = await import('../lib/swaggerParser');
        const routes = parseSwagger(swaggerSource.rawContent);
        setRoutes(routes, swaggerSource);
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
