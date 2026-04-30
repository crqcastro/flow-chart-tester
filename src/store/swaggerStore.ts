import { create } from 'zustand';
import type { RouteDefinition, SwaggerSource } from '../types/swagger';

export interface ImportedSource {
  type: 'swagger' | 'postman' | 'manual';
  label: string;
  source: SwaggerSource;
  routeIds: string[];
}

interface SwaggerState {
  routes: RouteDefinition[];
  sources: ImportedSource[];  // track multiple imported sources
  // legacy compat
  source: SwaggerSource | null;

  setRoutes: (routes: RouteDefinition[], source: SwaggerSource) => void;
  appendRoutes: (routes: RouteDefinition[], importedSource: ImportedSource) => void;
  removeSource: (label: string) => void;
  clearRoutes: () => void;
}

export const useSwaggerStore = create<SwaggerState>((set, get) => ({
  routes: [],
  sources: [],
  source: null,

  setRoutes: (routes, source) => {
    const importedSource: ImportedSource = {
      type: 'swagger',
      label: source.url ?? source.fileName ?? 'swagger',
      source,
      routeIds: routes.map((r) => r.id),
    };
    set({ routes, source, sources: [importedSource] });
  },

  appendRoutes: (routes, importedSource) => {
    const { routes: existing, sources } = get();
    // Replace if same label (re-import)
    const filtered = existing.filter((r) => !importedSource.routeIds.includes(r.id));
    const filteredSources = sources.filter((s) => s.label !== importedSource.label);
    set({
      routes: [...filtered, ...routes],
      sources: [...filteredSources, importedSource],
      source: importedSource.source,
    });
  },

  removeSource: (label) => {
    const { routes, sources } = get();
    const src = sources.find((s) => s.label === label);
    if (!src) return;
    set({
      routes: routes.filter((r) => !src.routeIds.includes(r.id)),
      sources: sources.filter((s) => s.label !== label),
    });
  },

  clearRoutes: () => set({ routes: [], sources: [], source: null }),
}));
