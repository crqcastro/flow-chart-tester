import { useState } from 'react';
import { parseSwagger } from '../lib/swaggerParser';
import { parsePostmanCollection } from '../lib/postmanParser';
import { useSwaggerStore } from '../store/swaggerStore';
import type { SwaggerSource } from '../types/swagger';

interface UseSwaggerImportReturn {
  loading: boolean;
  error: string | null;
  importFromUrl: (url: string) => Promise<boolean>;
  importFromFile: (file: File) => Promise<boolean>;
}

function isPostmanCollection(raw: string): boolean {
  try {
    const doc = JSON.parse(raw) as Record<string, unknown>;
    const schema = (doc.info as Record<string, unknown>)?.schema as string ?? '';
    return schema.includes('getpostman.com') || (doc.info !== undefined && Array.isArray(doc.item));
  } catch {
    return false;
  }
}

export function useSwaggerImport(): UseSwaggerImportReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRoutes, appendRoutes } = useSwaggerStore();

  async function processContent(rawContent: string, source: SwaggerSource): Promise<boolean> {
    if (isPostmanCollection(rawContent)) {
      const routes = parsePostmanCollection(rawContent);
      appendRoutes(routes, {
        type: 'postman',
        label: source.url ?? source.fileName ?? 'postman',
        source,
        routeIds: routes.map((r) => r.id),
      });
    } else {
      const routes = parseSwagger(rawContent);
      setRoutes(routes, source);
    }
    return true;
  }

  async function importFromUrl(url: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}: ${res.statusText}`);
      const rawContent = await res.text();
      const source: SwaggerSource = { type: 'url', url, rawContent };
      return await processContent(rawContent, source);
    } catch (err) {
      setError(`Falha ao importar da URL: ${(err as Error).message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function importFromFile(file: File): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const rawContent = await file.text();
      const source: SwaggerSource = { type: 'file', fileName: file.name, rawContent };
      return await processContent(rawContent, source);
    } catch (err) {
      setError(`Falha ao importar arquivo: ${(err as Error).message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, importFromUrl, importFromFile };
}
