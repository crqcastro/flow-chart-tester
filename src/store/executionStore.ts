import { create } from 'zustand';
import type { ExecutionResult, ExecutionSummary } from '../types/execution';

interface ExecutionState {
  running: boolean;
  results: Map<string, ExecutionResult>;
  summary: ExecutionSummary | null;
  proxyUrl: string;
  /** Node IDs in the order they started executing (for the execution modal). */
  executionLog: string[];

  setRunning: (v: boolean) => void;
  updateResult: (result: ExecutionResult) => void;
  clearResults: () => void;
  setSummary: (s: ExecutionSummary) => void;
  setProxyUrl: (url: string) => void;
  addToLog: (nodeId: string) => void;
}

const savedProxy = typeof localStorage !== 'undefined' ? localStorage.getItem('flowchart_proxy') ?? '' : '';

export const useExecutionStore = create<ExecutionState>((set) => ({
  running: false,
  results: new Map(),
  summary: null,
  proxyUrl: savedProxy,
  executionLog: [],

  setRunning: (v) => set({ running: v }),

  updateResult: (result) =>
    set((state) => {
      const next = new Map(state.results);
      next.set(result.nodeId, result);
      return { results: next };
    }),

  clearResults: () => set({ results: new Map(), summary: null, executionLog: [] }),

  addToLog: (nodeId) =>
    set((s) => ({ executionLog: s.executionLog.includes(nodeId) ? s.executionLog : [...s.executionLog, nodeId] })),

  setSummary: (summary) => set({ summary }),

  setProxyUrl: (url) => {
    localStorage.setItem('flowchart_proxy', url);
    set({ proxyUrl: url });
  },
}));
