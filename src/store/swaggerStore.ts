import { create } from 'zustand';
import type { RouteDefinition, SwaggerSource } from '../types/swagger';

interface SwaggerState {
  routes: RouteDefinition[];
  source: SwaggerSource | null;
  setRoutes: (routes: RouteDefinition[], source: SwaggerSource) => void;
  clearRoutes: () => void;
}

export const useSwaggerStore = create<SwaggerState>((set) => ({
  routes: [],
  source: null,
  setRoutes: (routes, source) => set({ routes, source }),
  clearRoutes: () => set({ routes: [], source: null }),
}));
