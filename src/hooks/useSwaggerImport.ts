import { useState } from 'react';
import { parseSwagger } from '../lib/swaggerParser';
import { useSwaggerStore } from '../store/swaggerStore';
import type { SwaggerSource } from '../types/swagger';

interface UseSwaggerImportReturn {
  loading: boolean;
  error: string | null;
  importFromUrl: (url: string) => Promise<boolean>;
  importFromFile: (file: File) => Promise<boolean>;
}

export function useSwaggerImport(): UseSwaggerImportReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setRoutes = useSwaggerStore((s) => s.setRoutes);

  async function importFromUrl(url: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}: ${res.statusText}`);
      const rawContent = await res.text();
      const routes = parseSwagger(rawContent);
      const source: SwaggerSource = { type: 'url', url, rawContent };
      setRoutes(routes, source);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Falha ao importar da URL: ${msg}`);
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
      const routes = parseSwagger(rawContent);
      const source: SwaggerSource = { type: 'file', fileName: file.name, rawContent };
      setRoutes(routes, source);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Falha ao importar arquivo: ${msg}`);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, importFromUrl, importFromFile };
}
