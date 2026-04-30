import { create } from 'zustand';
import type { ExecutionResult, ExecutionSummary } from '../types/execution';

interface ExecutionState {
  running: boolean;
  results: Map<string, ExecutionResult>;
  summary: ExecutionSummary | null;
  proxyUrl: string;

  setRunning: (v: boolean) => void;
  updateResult: (result: ExecutionResult) => void;
  clearResults: () => void;
  setSummary: (s: ExecutionSummary) => void;
  setProxyUrl: (url: string) => void;
}

const savedProxy = typeof localStorage !== 'undefined' ? localStorage.getItem('flowchart_proxy') ?? '' : '';

export const useExecutionStore = create<ExecutionState>((set) => ({
  running: false,
  results: new Map(),
  summary: null,
  proxyUrl: savedProxy,

  setRunning: (v) => set({ running: v }),

  updateResult: (result) =>
    set((state) => {
      const next = new Map(state.results);
      next.set(result.nodeId, result);
      return { results: next };
    }),

  clearResults: () => set({ results: new Map(), summary: null }),

  setSummary: (summary) => set({ summary }),

  setProxyUrl: (url) => {
    localStorage.setItem('flowchart_proxy', url);
    set({ proxyUrl: url });
  },
}));
